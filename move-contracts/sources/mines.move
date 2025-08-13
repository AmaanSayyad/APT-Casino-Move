module apt_casino::mines {
    use std::signer;
    use aptos_framework::event;
    use aptos_framework::error;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::randomness;

    /// Admin/House state
    struct House has key { admin: address }

    /// Per-user escrowed balance (internal ledger in Octas)
    struct Balance has key { amount: u64 }

    #[event]
    struct MinesBetPlaced has drop, store, copy { player: address, amount: u64, pick: u8 }
    #[event]
    struct MinesBetResult has drop, store, copy { player: address, win: bool, mine: u8, payout: u64 }

    const E_NOT_ADMIN: u64 = 1;
    const E_INSUFFICIENT_ESCROW: u64 = 2;
    const E_INVALID_BET: u64 = 3;
    const E_ALREADY_INIT: u64 = 4;

    public entry fun init(admin: &signer) {
        assert!(!exists<House>(signer::address_of(admin)), E_ALREADY_INIT);
        move_to(admin, House { admin: signer::address_of(admin) });
        coin::register<AptosCoin>(admin);
    }

    public entry fun deposit(user: &signer, amount: u64, house_addr: address) acquires Balance {
        coin::transfer<AptosCoin>(user, house_addr, amount);
        let addr = signer::address_of(user);
        if (exists<Balance>(addr)) {
            let b = borrow_global_mut<Balance>(addr);
            b.amount = b.amount + amount;
        } else {
            move_to(user, Balance { amount });
        }
    }

    public entry fun request_withdraw(user: &signer, amount: u64) acquires Balance {
        let addr = signer::address_of(user);
        assert!(exists<Balance>(addr), error::not_found(E_INSUFFICIENT_ESCROW));
        let b = borrow_global_mut<Balance>(addr);
        assert!(b.amount >= amount, error::invalid_argument(E_INSUFFICIENT_ESCROW));
        b.amount = b.amount - amount;
    }

    public entry fun admin_payout(admin: &signer, to: address, amount: u64) acquires House {
        assert!(signer::address_of(admin) == get_admin_addr(), error::permission_denied(E_NOT_ADMIN));
        coin::transfer<AptosCoin>(admin, to, amount);
    }

    #[randomness]
    entry fun house_play(admin: &signer, player: address, amount: u64, pick: u8) acquires House, Balance {
        assert!(signer::address_of(admin) == get_admin_addr(), error::permission_denied(E_NOT_ADMIN));
        play_internal(player, amount, pick);
    }

    #[randomness]
    entry fun user_play(user: &signer, amount: u64, pick: u8) acquires Balance {
        let addr = signer::address_of(user);
        play_internal(addr, amount, pick);
    }

    fun play_internal(player: address, amount: u64, pick: u8) acquires Balance {
        assert!(exists<Balance>(player), error::not_found(E_INSUFFICIENT_ESCROW));
        let b = borrow_global_mut<Balance>(player);
        assert!(b.amount >= amount && amount > 0, error::invalid_argument(E_INVALID_BET));
        assert!(pick < 25, error::invalid_argument(E_INVALID_BET));

        event::emit<MinesBetPlaced>(MinesBetPlaced { player, amount, pick });
        b.amount = b.amount - amount;
        let mine: u8 = (randomness::u64_range(0, 25u64) as u8);
        let win = (pick != mine);
        let payout = if (win) amount * 2 else 0;
        if (win && payout > 0) { b.amount = b.amount + payout; };
        event::emit<MinesBetResult>(MinesBetResult { player, win, mine, payout });
    }

    public fun get_balance(addr: address): u64 acquires Balance { if (exists<Balance>(addr)) borrow_global<Balance>(addr).amount else 0 }
    public fun get_admin_addr(): address acquires House { borrow_global<House>(@apt_casino).admin }
}
