module apt_casino::wheel {
    use std::signer;
    use std::vector;
    use std::hash;
    use std::bcs;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};

    /// Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
    const EINVALID_RISK_LEVEL: u64 = 3;
    const EINVALID_AMOUNT: u64 = 4;
    const ENO_GAME_ACTIVE: u64 = 5;
    const EGAME_ALREADY_ACTIVE: u64 = 6;

    /// Risk levels
    const RISK_LOW: u8 = 0;
    const RISK_MEDIUM: u8 = 1;
    const RISK_HIGH: u8 = 2;

    /// Game state
    struct GameState has key {
        active: bool,
        current_game_id: u64,
        total_games: u64,
        total_volume: u64,
        total_wins: u64,
        total_losses: u64,
    }

    /// Player game state
    struct PlayerGame has key {
        game_id: u64,
        player: address,
        bet_amount: u64,
        risk_level: u8,
        segments: u8,
        result: u8,
        multiplier: u64,
        winnings: u64,
        game_active: bool,
        start_time: u64,
    }

    /// Events
    struct GameStartedEvent has drop, store {
        game_id: u64,
        player: address,
        bet_amount: u64,
        risk_level: u8,
    }

    struct GameResultEvent has drop, store {
        game_id: u64,
        player: address,
        bet_amount: u64,
        result: u8,
        multiplier: u64,
        winnings: u64,
    }

    /// Event handles
    struct WheelEvents has key {
        game_started_events: EventHandle<GameStartedEvent>,
        game_result_events: EventHandle<GameResultEvent>,
    }

    /// Initialize the wheel game
    fun init_module(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Initialize game state
        move_to(account, GameState {
            active: true,
            current_game_id: 0,
            total_games: 0,
            total_volume: 0,
            total_wins: 0,
            total_losses: 0,
        });

        // Initialize events
        move_to(account, WheelEvents {
            game_started_events: event::new_event_handle<GameStartedEvent>(account),
            game_result_events: event::new_event_handle<GameResultEvent>(account),
        });
    }

    /// Spin the wheel
    public entry fun spin(
        player: &signer,
        bet_amount: u64,
        risk_level: u8,
    ) acquires GameState, WheelEvents, PlayerGame {
        let player_addr = signer::address_of(player);
        
        // Validate parameters
        assert!(bet_amount > 0, EINVALID_AMOUNT);
        assert!(risk_level <= RISK_HIGH, EINVALID_RISK_LEVEL);
        
        // Check if player has active game
        assert!(!exists<PlayerGame>(player_addr), EGAME_ALREADY_ACTIVE);
        
        // Withdraw player's APT
        let player_coins = coin::withdraw<AptosCoin>(player, bet_amount);
        
        // Get game state
        let game_state = borrow_global_mut<GameState>(@apt_casino);
        game_state.current_game_id = game_state.current_game_id + 1;
        game_state.total_games = game_state.total_games + 1;
        game_state.total_volume = game_state.total_volume + bet_amount;
        
        // Generate result and calculate multiplier
        let (result, multiplier, segments) = generate_wheel_result(risk_level);
        
        // Calculate winnings
        let winnings = if (multiplier > 0) {
            bet_amount * multiplier / 10000
        } else {
            0
        };
        
        // Create player game
        let player_game = PlayerGame {
            game_id: game_state.current_game_id,
            player: player_addr,
            bet_amount,
            risk_level,
            segments,
            result,
            multiplier,
            winnings,
            game_active: false,
            start_time: timestamp::now_seconds(),
        };
        
        // Store player game
        move_to(player, player_game);
        
        // Emit game started event
        let events = borrow_global_mut<WheelEvents>(@apt_casino);
        event::emit_event(&mut events.game_started_events, GameStartedEvent {
            game_id: game_state.current_game_id,
            player: player_addr,
            bet_amount,
            risk_level,
        });
        
        // Emit game result event
        event::emit_event(&mut events.game_result_events, GameResultEvent {
            game_id: game_state.current_game_id,
            player: player_addr,
            bet_amount,
            result,
            multiplier,
            winnings,
        });
        
        // Transfer winnings if any
        if (winnings > 0) {
            let winnings_coins = coin::withdraw<AptosCoin>(&account::create_signer_with_capability(&get_capability()), winnings);
            coin::deposit(player_addr, winnings_coins);
            
            // Update global stats
            game_state.total_wins = game_state.total_wins + 1;
        } else {
            // Update global stats
            game_state.total_losses = game_state.total_losses + 1;
        };
    }

    /// Generate wheel result based on risk level
    fun generate_wheel_result(risk_level: u8): (u8, u64, u8) {
        let seed = vector::empty<u8>();
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_seconds()));
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_microseconds()));
        
        let hash = hash::sha3_256(seed);
        let random_value = 0;
        let i = 0;
        while (i < 8) {
            random_value = random_value + (*vector::borrow(&hash, i) as u64);
            i = i + 1;
        };
        
        // Generate result based on risk level
        if (risk_level == RISK_LOW) {
            // Low risk: 10 segments, multipliers 1.2x to 2.5x
            let segments = 10;
            let result = (random_value % segments) as u8;
            let multiplier = calculate_low_risk_multiplier(result);
            (result, multiplier, segments)
        } else if (risk_level == RISK_MEDIUM) {
            // Medium risk: 8 segments, multipliers 1.5x to 5x
            let segments = 8;
            let result = (random_value % segments) as u8;
            let multiplier = calculate_medium_risk_multiplier(result);
            (result, multiplier, segments)
        } else {
            // High risk: 6 segments, multipliers 2x to 10x
            let segments = 6;
            let result = (random_value % segments) as u8;
            let multiplier = calculate_high_risk_multiplier(result);
            (result, multiplier, segments)
        }
    }

    /// Calculate multiplier for low risk
    fun calculate_low_risk_multiplier(result: u8): u64 {
        // Low risk multipliers: 1.2x, 1.3x, 1.4x, 1.5x, 1.6x, 1.7x, 1.8x, 1.9x, 2.0x, 2.5x
        let multipliers = vector[12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 25000];
        *vector::borrow(&multipliers, (result as u64))
    }

    /// Calculate multiplier for medium risk
    fun calculate_medium_risk_multiplier(result: u8): u64 {
        // Medium risk multipliers: 1.5x, 2x, 2.5x, 3x, 3.5x, 4x, 4.5x, 5x
        let multipliers = vector[15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000];
        *vector::borrow(&multipliers, (result as u64))
    }

    /// Calculate multiplier for high risk
    fun calculate_high_risk_multiplier(result: u8): u64 {
        // High risk multipliers: 2x, 3x, 4x, 5x, 7x, 10x
        let multipliers = vector[20000, 30000, 40000, 50000, 70000, 100000];
        *vector::borrow(&multipliers, (result as u64))
    }

    /// Get capability for resource account
    fun get_capability(): account::SignerCapability {
        let capability = borrow_global<WheelCapability>(@apt_casino);
        capability.signer_cap
    }

    /// Get game state
    public fun get_game_state(): (bool, u64, u64, u64, u64, u64) acquires GameState {
        let game_state = borrow_global<GameState>(@apt_casino);
        (game_state.active, game_state.current_game_id, game_state.total_games, game_state.total_volume, game_state.total_wins, game_state.total_losses)
    }

    /// Get player game
    public fun get_player_game(player_addr: address): (u64, address, u64, u8, u8, u8, u64, u64, bool) acquires PlayerGame {
        assert!(exists<PlayerGame>(player_addr), ENO_GAME_ACTIVE);
        let player_game = borrow_global<PlayerGame>(player_addr);
        (player_game.game_id, player_game.player, player_game.bet_amount, player_game.risk_level, player_game.segments, player_game.result, player_game.multiplier, player_game.winnings, player_game.game_active)
    }

    /// Check if player has active game
    public fun has_active_game(player_addr: address): bool {
        exists<PlayerGame>(player_addr)
    }

    /// Get risk level name
    public fun get_risk_level_name(risk_level: u8): vector<u8> {
        if (risk_level == RISK_LOW) {
            b"Low"
        } else if (risk_level == RISK_MEDIUM) {
            b"Medium"
        } else {
            b"High"
        }
    }

    /// Get multiplier as string
    public fun get_multiplier_string(multiplier: u64): vector<u8> {
        let multiplier_float = (multiplier as f64) / 10000.0;
        bcs::to_bytes(&multiplier_float)
    }
}

/// Capability for resource account
struct WheelCapability has key {
    signer_cap: account::SignerCapability,
} 