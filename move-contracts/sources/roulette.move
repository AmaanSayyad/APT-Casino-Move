module apt_casino::roulette {
    use std::signer;
    use std::vector;
    use std::hash;
    use std::bcs;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_framework::resource_account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::event_store;

    /// Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
    const EINVALID_BET_TYPE: u64 = 3;
    const EINVALID_BET_VALUE: u64 = 4;
    const EINVALID_AMOUNT: u64 = 5;
    const ENO_GAME_ACTIVE: u64 = 6;
    const EGAME_ALREADY_ACTIVE: u64 = 7;

    /// Bet types
    const BET_TYPE_NUMBER: u8 = 0;
    const BET_TYPE_COLOR: u8 = 1;
    const BET_TYPE_ODD_EVEN: u8 = 2;
    const BET_TYPE_HIGH_LOW: u8 = 3;
    const BET_TYPE_DOZEN: u8 = 4;
    const BET_TYPE_COLUMN: u8 = 5;
    const BET_TYPE_SPLIT: u8 = 6;
    const BET_TYPE_STREET: u8 = 7;
    const BET_TYPE_CORNER: u8 = 8;
    const BET_TYPE_LINE: u8 = 9;

    /// Game state
    struct GameState has key {
        active: bool,
        current_round: u64,
        total_bets: u64,
        total_amount: u64,
        bets: vector<Bet>,
        random_seed: vector<u8>,
        last_update: u64,
    }

    /// Bet structure
    struct Bet has store, drop {
        player: address,
        amount: u64,
        bet_type: u8,
        bet_value: u8,
        numbers: vector<u8>,
        round: u64,
    }

    /// Events
    struct BetPlacedEvent has drop, store {
        player: address,
        amount: u64,
        bet_type: u8,
        bet_value: u8,
        round: u64,
    }

    struct BetResultEvent has drop, store {
        player: address,
        amount: u64,
        won: bool,
        winnings: u64,
        round: u64,
        result: u8,
    }

    struct RandomGeneratedEvent has drop, store {
        random_number: u8,
        round: u64,
    }

    /// Capabilities
    struct RouletteCapability has key {
        signer_cap: account::SignerCapability,
    }

    /// Event handles
    struct RouletteEvents has key {
        bet_placed_events: EventHandle<BetPlacedEvent>,
        bet_result_events: EventHandle<BetResultEvent>,
        random_generated_events: EventHandle<RandomGeneratedEvent>,
    }

    /// Initialize the roulette game
    fun init_module(account: &signer) {
        let account_addr = signer::address_of(account);
        
        // Create resource account for the casino
        let (resource_signer, resource_signer_cap) = account::create_resource_account(
            account,
            b"roulette_seed"
        );

        // Store the capability
        move_to(account, RouletteCapability {
            signer_cap: resource_signer_cap,
        });

        // Initialize game state
        move_to(&resource_signer, GameState {
            active: false,
            current_round: 0,
            total_bets: 0,
            total_amount: 0,
            bets: vector::empty(),
            random_seed: vector::empty(),
            last_update: 0,
        });

        // Initialize events
        move_to(&resource_signer, RouletteEvents {
            bet_placed_events: event::new_event_handle<BetPlacedEvent>(&resource_signer),
            bet_result_events: event::new_event_handle<BetResultEvent>(&resource_signer),
            random_generated_events: event::new_event_handle<RandomGeneratedEvent>(&resource_signer),
        });
    }

    /// Place a bet
    public entry fun place_bet(
        player: &signer,
        bet_type: u8,
        bet_value: u8,
        amount: u64,
        numbers: vector<u8>,
    ) acquires GameState, RouletteEvents {
        let player_addr = signer::address_of(player);
        
        // Validate bet amount
        assert!(amount > 0, EINVALID_AMOUNT);
        
        // Get player's APT balance
        let player_coin_store = coin::withdraw<AptosCoin>(player, amount);
        
        // Get game state
        let game_state = borrow_global_mut<GameState>(@apt_casino);
        
        // Start new round if not active
        if (!game_state.active) {
            game_state.active = true;
            game_state.current_round = game_state.current_round + 1;
            game_state.total_bets = 0;
            game_state.total_amount = 0;
            game_state.bets = vector::empty();
            game_state.random_seed = vector::empty();
            game_state.last_update = timestamp::now_seconds();
        };

        // Validate bet
        validate_bet(bet_type, bet_value, &numbers);
        
        // Create bet
        let bet = Bet {
            player: player_addr,
            amount,
            bet_type,
            bet_value,
            numbers,
            round: game_state.current_round,
        };
        
        // Add bet to game
        vector::push_back(&mut game_state.bets, bet);
        game_state.total_bets = game_state.total_bets + 1;
        game_state.total_amount = game_state.total_amount + amount;
        
        // Emit bet placed event
        let events = borrow_global_mut<RouletteEvents>(@apt_casino);
        event::emit_event(&mut events.bet_placed_events, BetPlacedEvent {
            player: player_addr,
            amount,
            bet_type,
            bet_value,
            round: game_state.current_round,
        });
        
        // Generate random number and process bets if enough time has passed
        if (game_state.total_bets >= 1 && 
            timestamp::now_seconds() >= game_state.last_update + 30) {
            generate_random_and_process_bets();
        };
    }

    /// Generate random number and process all bets
    fun generate_random_and_process_bets() acquires GameState, RouletteEvents {
        let game_state = borrow_global_mut<GameState>(@apt_casino);
        let events = borrow_global_mut<RouletteEvents>(@apt_casino);
        
        // Generate random number using on-chain randomness
        let random_number = generate_random_number();
        
        // Emit random generated event
        event::emit_event(&mut events.random_generated_events, RandomGeneratedEvent {
            random_number,
            round: game_state.current_round,
        });
        
        // Process all bets
        let i = 0;
        let len = vector::length(&game_state.bets);
        while (i < len) {
            let bet = vector::borrow(&game_state.bets, i);
            let (won, winnings) = calculate_winnings(bet, random_number);
            
            // Emit bet result event
            event::emit_event(&mut events.bet_result_events, BetResultEvent {
                player: bet.player,
                amount: bet.amount,
                won,
                winnings,
                round: game_state.current_round,
                result: random_number,
            });
            
            i = i + 1;
        };
        
        // Reset game state
        game_state.active = false;
        game_state.bets = vector::empty();
        game_state.total_bets = 0;
        game_state.total_amount = 0;
    }

    /// Generate random number using on-chain randomness
    fun generate_random_number(): u8 {
        let seed = vector::empty<u8>();
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_seconds()));
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_microseconds()));
        
        let hash = hash::sha3_256(seed);
        let random_bytes = vector::empty<u8>();
        vector::append(&mut random_bytes, hash);
        
        // Convert to number 0-36 (roulette has 37 numbers: 0-36)
        let random_value = 0;
        let i = 0;
        while (i < 8) {
            random_value = random_value + (*vector::borrow(&random_bytes, i) as u64);
            i = i + 1;
        };
        
        ((random_value % 37) as u8)
    }

    /// Calculate winnings for a bet
    fun calculate_winnings(bet: &Bet, result: u8): (bool, u64) {
        if (bet.bet_type == BET_TYPE_NUMBER) {
            if (bet.bet_value == result) {
                return (true, bet.amount * 36)
            }
        } else if (bet.bet_type == BET_TYPE_COLOR) {
            let is_red = is_red_number(result);
            if ((bet.bet_value == 0 && is_red) || (bet.bet_value == 1 && !is_red)) {
                return (true, bet.amount * 2)
            }
        } else if (bet.bet_type == BET_TYPE_ODD_EVEN && result != 0) {
            let is_even = result % 2 == 0;
            if ((bet.bet_value == 0 && !is_even) || (bet.bet_value == 1 && is_even)) {
                return (true, bet.amount * 2)
            }
        } else if (bet.bet_type == BET_TYPE_HIGH_LOW && result != 0) {
            let is_high = result >= 19;
            if ((bet.bet_value == 0 && !is_high) || (bet.bet_value == 1 && is_high)) {
                return (true, bet.amount * 2)
            }
        } else if (bet.bet_type == BET_TYPE_DOZEN && result != 0) {
            let dozen = (result - 1) / 12;
            if (bet.bet_value == dozen) {
                return (true, bet.amount * 3)
            }
        } else if (bet.bet_type == BET_TYPE_COLUMN && result != 0) {
            let column = (result - 1) % 3;
            if (bet.bet_value == column) {
                return (true, bet.amount * 3)
            }
        } else if (bet.bet_type == BET_TYPE_SPLIT || 
                   bet.bet_type == BET_TYPE_STREET || 
                   bet.bet_type == BET_TYPE_CORNER || 
                   bet.bet_type == BET_TYPE_LINE) {
            if (contains_number(&bet.numbers, result)) {
                let multiplier = if (bet.bet_type == BET_TYPE_SPLIT) { 18 }
                               else if (bet.bet_type == BET_TYPE_STREET) { 12 }
                               else if (bet.bet_type == BET_TYPE_CORNER) { 9 }
                               else { 6 };
                return (true, bet.amount * multiplier)
            }
        };
        
        (false, 0)
    }

    /// Check if number is red
    fun is_red_number(number: u8): bool {
        let red_numbers = vector[1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        let i = 0;
        while (i < vector::length(&red_numbers)) {
            if (*vector::borrow(&red_numbers, i) == number) {
                return true
            };
            i = i + 1;
        };
        false
    }

    /// Check if vector contains number
    fun contains_number(numbers: &vector<u8>, target: u8): bool {
        let i = 0;
        while (i < vector::length(numbers)) {
            if (*vector::borrow(numbers, i) == target) {
                return true
            };
            i = i + 1;
        };
        false
    }

    /// Validate bet
    fun validate_bet(bet_type: u8, bet_value: u8, numbers: &vector<u8>) {
        if (bet_type == BET_TYPE_NUMBER) {
            assert!(bet_value <= 36, EINVALID_BET_VALUE);
            assert!(vector::length(numbers) == 0, EINVALID_BET_VALUE);
        } else if (bet_type == BET_TYPE_COLOR || bet_type == BET_TYPE_ODD_EVEN || bet_type == BET_TYPE_HIGH_LOW) {
            assert!(bet_value <= 1, EINVALID_BET_VALUE);
            assert!(vector::length(numbers) == 0, EINVALID_BET_VALUE);
        } else if (bet_type == BET_TYPE_DOZEN || bet_type == BET_TYPE_COLUMN) {
            assert!(bet_value <= 2, EINVALID_BET_VALUE);
            assert!(vector::length(numbers) == 0, EINVALID_BET_VALUE);
        } else if (bet_type == BET_TYPE_SPLIT) {
            assert!(vector::length(numbers) == 2, EINVALID_BET_VALUE);
        } else if (bet_type == BET_TYPE_STREET) {
            assert!(vector::length(numbers) == 3, EINVALID_BET_VALUE);
        } else if (bet_type == BET_TYPE_CORNER) {
            assert!(vector::length(numbers) == 4, EINVALID_BET_VALUE);
        } else if (bet_type == BET_TYPE_LINE) {
            assert!(vector::length(numbers) == 6, EINVALID_BET_VALUE);
        } else {
            abort EINVALID_BET_TYPE
        }
    }

    /// Get game state
    public fun get_game_state(): (bool, u64, u64, u64) acquires GameState {
        let game_state = borrow_global<GameState>(@apt_casino);
        (game_state.active, game_state.current_round, game_state.total_bets, game_state.total_amount)
    }

    /// Get bet by index
    public fun get_bet(index: u64): (address, u64, u8, u8, vector<u8>, u64) acquires GameState {
        let game_state = borrow_global<GameState>(@apt_casino);
        assert!(index < vector::length(&game_state.bets), EINVALID_BET_VALUE);
        let bet = vector::borrow(&game_state.bets, index);
        (bet.player, bet.amount, bet.bet_type, bet.bet_value, bet.numbers, bet.round)
    }

    /// Get total bets count
    public fun get_total_bets(): u64 acquires GameState {
        let game_state = borrow_global<GameState>(@apt_casino);
        vector::length(&game_state.bets)
    }
} 