module apt_casino::plinko {
    use std::signer;
    use std::vector;
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
    struct PlinkoBetPlaced has drop, store, copy { 
        player: address, 
        amount: u64, 
        risk_level: u8, 
        rows: u8 
    }
    
    #[event]
    struct PlinkoBetResult has drop, store, copy { 
        player: address, 
        win: bool, 
        final_position: u8, 
        payout: u64,
        path: vector<u8>
    }

    const E_NOT_ADMIN: u64 = 1;
    const E_INSUFFICIENT_ESCROW: u64 = 2;
    const E_INVALID_BET: u64 = 3;
    const E_ALREADY_INIT: u64 = 4;
    const E_INVALID_RISK_LEVEL: u64 = 5;
    const E_INVALID_ROWS: u64 = 6;

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
    entry fun house_play(admin: &signer, player: address, amount: u64, risk_level: u8, rows: u8) acquires House, Balance {
        assert!(signer::address_of(admin) == get_admin_addr(), error::permission_denied(E_NOT_ADMIN));
        play_internal(admin, player, amount, risk_level, rows);
    }

    #[randomness]
    entry fun user_play(user: &signer, amount: u64, risk_level: u8, rows: u8) acquires Balance {
        let user_addr = signer::address_of(user);
        
        // Take APT directly from user's wallet
        coin::transfer<AptosCoin>(user, @apt_casino, amount);
        
        // Create plinko balance for this user if it doesn't exist
        if (!exists<Balance>(user_addr)) {
            move_to(user, Balance { amount: 0 });
        };
        
        // Now play with the bet amount
        play_internal(user, user_addr, amount, risk_level, rows);
    }

    fun play_internal(user: &signer, player: address, amount: u64, risk_level: u8, rows: u8) acquires Balance {
        assert!(amount > 0, error::invalid_argument(E_INVALID_BET));
        assert!(risk_level >= 1 && risk_level <= 3, error::invalid_argument(E_INVALID_RISK_LEVEL));
        assert!(rows >= 8 && rows <= 16, error::invalid_argument(E_INVALID_ROWS));

        event::emit<PlinkoBetPlaced>(PlinkoBetPlaced { 
            player, 
            amount, 
            risk_level, 
            rows 
        });
        
        // Simulate the Plinko ball drop path
        let path = simulate_plinko_path(rows);
        
        // Calculate final position (0 to rows)
        let final_position = calculate_final_position(&path);
        
        // Calculate payout based on risk level and final position
        let (win, payout) = calculate_payout(amount, risk_level, final_position, rows);
        
        if (win && payout > 0) {
            let b = borrow_global_mut<Balance>(player);
            b.amount = b.amount + payout;
        };
        
        event::emit<PlinkoBetResult>(PlinkoBetResult { 
            player, 
            win, 
            final_position, 
            payout, 
            path 
        });
    }

    /// Simulate the Plinko ball drop path
    fun simulate_plinko_path(rows: u8): vector<u8> {
        let path = vector::empty<u8>();
        let current_position = 0; // Start at center (position 0)
        
        let i = 0;
        while (i < rows) {
            // Randomly decide if ball goes left (-1) or right (+1)
            let direction = if (randomness::u64_range(0, 2) == 0) { 0 } else { 1 };
            vector::push_back(&mut path, direction);
            
            // Update position (0 = left, 1 = right)
            current_position = current_position + (if (direction == 0) { 0 } else { 1 });
            i = i + 1;
        };
        
        path
    }

    /// Calculate final position from path
    fun calculate_final_position(path: &vector<u8>): u8 {
        let final_pos = 0;
        let i = 0;
        let len = vector::length(path);
        
        while (i < len) {
            let direction = *vector::borrow(path, i);
            final_pos = final_pos + (if (direction == 0) { 0 } else { 1 });
            i = i + 1;
        };
        
        // Convert to positive index (0 to rows)
        final_pos as u8
    }

    /// Calculate payout based on risk level and final position
    fun calculate_payout(amount: u64, risk_level: u8, final_position: u8, rows: u8): (bool, u64) {
        let multiplier = get_multiplier(risk_level, final_position, rows);
        
        if (multiplier > 0) {
            (true, amount * multiplier / 100)
        } else {
            (false, 0)
        }
    }

    /// Get multiplier based on risk level and final position
    fun get_multiplier(risk_level: u8, final_position: u8, rows: u8): u64 {
        if (risk_level == 1) {
            // Low risk: Higher chance of winning, lower payouts
            if (final_position == 0 || final_position == rows) { 200 } // 2x
            else if (final_position == 1 || final_position == rows - 1) { 150 } // 1.5x
            else if (final_position == 2 || final_position == rows - 2) { 120 } // 1.2x
            else { 0 }
        } else if (risk_level == 2) {
            // Medium risk: Balanced risk/reward
            if (final_position == 0 || final_position == rows) { 500 } // 5x
            else if (final_position == 1 || final_position == rows - 1) { 300 } // 3x
            else if (final_position == 2 || final_position == rows - 2) { 200 } // 2x
            else if (final_position == 3 || final_position == rows - 3) { 150 } // 1.5x
            else { 0 }
        } else {
            // High risk: Lower chance of winning, higher payouts
            if (final_position == 0 || final_position == rows) { 1000 } // 10x
            else if (final_position == 1 || final_position == rows - 1) { 500 } // 5x
            else if (final_position == 2 || final_position == rows - 2) { 300 } // 3x
            else if (final_position == 3 || final_position == rows - 3) { 200 } // 2x
            else if (final_position == 4 || final_position == rows - 4) { 150 } // 1.5x
            else { 0 }
        }
    }

    /// View helpers
    public fun get_balance(addr: address): u64 acquires Balance { 
        if (exists<Balance>(addr)) borrow_global<Balance>(addr).amount else 0 
    }
    
    public fun get_admin_addr(): address acquires House { 
        borrow_global<House>(@apt_casino).admin 
    }
}
