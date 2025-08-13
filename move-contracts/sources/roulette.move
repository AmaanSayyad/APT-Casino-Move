module apt_casino::roulette {
    use std::signer;
    use aptos_framework::event; // module events
    use aptos_framework::error; // error helpers
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::randomness; // On-chain randomness (Aptos Roll)

    /// Admin/House state
    struct House has key {
        admin: address,
    }

    /// Per-user escrowed balance (internal ledger in Octas)
    struct Balance has key {
        amount: u64,
    }

    #[event]
    struct BetPlaced has drop, store, copy { player: address, amount: u64, bet_kind: u8, bet_value: u8 }
    #[event]
    struct BetResult has drop, store, copy { player: address, win: bool, roll: u8, payout: u64 }
    #[event]
    struct WithdrawRequested has drop, store, copy { player: address, amount: u64 }
    #[event]
    struct PayoutExecuted has drop, store, copy { player: address, amount: u64 }

    const E_NOT_ADMIN: u64 = 1;
    const E_INSUFFICIENT_ESCROW: u64 = 2;
    const E_INVALID_BET: u64 = 3;
    const E_ALREADY_INIT: u64 = 4;

    /// Publish admin resources under the deployer account.
    public entry fun init(admin: &signer) {
        assert!(!exists<House>(signer::address_of(admin)), E_ALREADY_INIT);
        move_to(admin, House { admin: signer::address_of(admin) });
        // Ensure the house has a CoinStore to receive deposits
        coin::register<AptosCoin>(admin);
    }

    /// User deposits APT into the house escrow. Requires one-time signature from the user.
    public entry fun deposit(user: &signer, amount: u64, house_addr: address) acquires Balance {
        // Transfer APT from user into the house's account
        coin::transfer<AptosCoin>(user, house_addr, amount);

        let user_addr = signer::address_of(user);
        if (exists<Balance>(user_addr)) {
            let b_ref = borrow_global_mut<Balance>(user_addr);
            b_ref.amount = b_ref.amount + amount;
        } else {
            move_to(user, Balance { amount });
        }
        // Note: deposit event intentionally omitted (bet events are primary)
    }

    /// Request withdrawal from internal escrow. House will later execute payout and pay gas.
    public entry fun request_withdraw(user: &signer, amount: u64) acquires Balance {
        let user_addr = signer::address_of(user);
        assert!(exists<Balance>(user_addr), error::not_found(E_INSUFFICIENT_ESCROW));
        let b_ref = borrow_global_mut<Balance>(user_addr);
        assert!(b_ref.amount >= amount, error::invalid_argument(E_INSUFFICIENT_ESCROW));
        b_ref.amount = b_ref.amount - amount;

        event::emit<WithdrawRequested>(WithdrawRequested { player: user_addr, amount });
    }

    /// Admin executes a payout: transfers APT from house to player. Gas is paid by the house.
    public entry fun admin_payout(admin: &signer, to: address, amount: u64) acquires House {
        assert!(signer::address_of(admin) == get_admin_addr(), error::permission_denied(E_NOT_ADMIN));
        coin::transfer<AptosCoin>(admin, to, amount);
        event::emit<PayoutExecuted>(PayoutExecuted { player: to, amount });
    }

    /// House places a bet on behalf of a player. Gas is paid by the house. The bet is settled
    /// instantly using on-chain randomness. The player's internal escrow is debited/credited.
    ///
    /// bet_kind:
    ///   0 = single number (0-36), payout 35x
    ///   1 = color (0=Red,1=Black) using parity rule (even=Black, odd=Red) for demo, payout 2x
    ///   2 = odd/even (0=Even,1=Odd), payout 2x
    #[randomness]
    entry fun house_place_bet(admin: &signer, player: address, amount: u64, bet_kind: u8, bet_value: u8) acquires House, Balance {
        assert!(signer::address_of(admin) == get_admin_addr(), error::permission_denied(E_NOT_ADMIN));

        // Load and check player's escrow balance
        assert!(exists<Balance>(player), error::not_found(E_INSUFFICIENT_ESCROW));
        let bal = borrow_global_mut<Balance>(player);
        assert!(bal.amount >= amount, error::invalid_argument(E_INSUFFICIENT_ESCROW));

        // Emit placement event
        event::emit<BetPlaced>(BetPlaced { player, amount, bet_kind, bet_value });

        // Debit upfront
        bal.amount = bal.amount - amount;

        // On-chain randomness: draw number in [0,36]
        // NOTE: Function name may change with framework version; replace with the stable API if needed.
        let roll: u8 = (randomness::u64_range(0, 37) as u8);

        let (win, payout) = settle(amount, bet_kind, bet_value, roll);
        if (win && payout > 0) {
            bal.amount = bal.amount + payout;
        };

        event::emit<BetResult>(BetResult { player, win, roll, payout });
    }

    /// View helpers
    public fun get_balance(addr: address): u64 acquires Balance { 
        if (exists<Balance>(addr)) borrow_global<Balance>(addr).amount else 0
    }

    public fun get_admin_addr(): address acquires House { borrow_global<House>(@apt_casino).admin }

    /// Payout calculation
    fun settle(amount: u64, bet_kind: u8, bet_value: u8, roll: u8): (bool, u64) {
        if (bet_kind == 0) {
            // Single number
            if (bet_value <= 36 && roll == bet_value) (true, amount * 35) else (false, 0)
        } else if (bet_kind == 1) {
            // Color by parity: even=Black(1), odd=Red(0). This is a demo mapping.
            let is_red = (roll % 2) == 1; // odd
            let bv_is_red = (bet_value == 0);
            if (roll != 0 && ((is_red && bv_is_red) || (!is_red && !bv_is_red))) (true, amount * 2) else (false, 0)
        } else if (bet_kind == 2) {
            // Odd / Even
            if (roll != 0) {
                let is_odd = (roll % 2) == 1;
                let want_odd = (bet_value == 1);
                if ((is_odd && want_odd) || (!is_odd && !want_odd)) (true, amount * 2) else (false, 0)
            } else (false, 0)
        } else {
            abort error::invalid_argument(E_INVALID_BET)
        }
    }

    /// User places a bet directly (user pays gas). Requires prior deposit to have escrow.
    #[randomness]
    entry fun user_place_bet(user: &signer, amount: u64, bet_kind: u8, bet_value: u8) acquires Balance {
        let user_addr = signer::address_of(user);
        assert!(exists<Balance>(user_addr), error::not_found(E_INSUFFICIENT_ESCROW));
        let bal = borrow_global_mut<Balance>(user_addr);
        assert!(bal.amount >= amount, error::invalid_argument(E_INSUFFICIENT_ESCROW));

        event::emit<BetPlaced>(BetPlaced { player: user_addr, amount, bet_kind, bet_value });
        bal.amount = bal.amount - amount;
        let roll: u8 = (randomness::u64_range(0, 37) as u8);
        let (win, payout) = settle(amount, bet_kind, bet_value, roll);
        if (win && payout > 0) bal.amount = bal.amount + payout;
        event::emit<BetResult>(BetResult { player: user_addr, win, roll, payout });
    }
}


