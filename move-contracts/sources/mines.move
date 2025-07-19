module apt_casino::mines {
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
    const EINVALID_MINES_COUNT: u64 = 3;
    const EINVALID_TILES_COUNT: u64 = 4;
    const EINVALID_AMOUNT: u64 = 5;
    const ENO_GAME_ACTIVE: u64 = 6;
    const EGAME_ALREADY_ACTIVE: u64 = 7;
    const EINVALID_TILE_INDEX: u64 = 8;
    const ETILE_ALREADY_REVEALED: u64 = 9;
    const ENO_GAME_FOUND: u64 = 10;

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
        mines_count: u8,
        tiles_to_reveal: u8,
        revealed_tiles: vector<u8>,
        mine_positions: vector<u8>,
        game_active: bool,
        multiplier: u64,
        start_time: u64,
    }

    /// Events
    struct GameStartedEvent has drop, store {
        game_id: u64,
        player: address,
        bet_amount: u64,
        mines_count: u8,
        tiles_to_reveal: u8,
    }

    struct TileRevealedEvent has drop, store {
        game_id: u64,
        player: address,
        tile_index: u8,
        is_mine: bool,
        multiplier: u64,
    }

    struct GameWonEvent has drop, store {
        game_id: u64,
        player: address,
        bet_amount: u64,
        winnings: u64,
        multiplier: u64,
    }

    struct GameLostEvent has drop, store {
        game_id: u64,
        player: address,
        bet_amount: u64,
        mine_position: u8,
    }

    struct CashoutEvent has drop, store {
        game_id: u64,
        player: address,
        bet_amount: u64,
        winnings: u64,
        multiplier: u64,
    }

    /// Event handles
    struct MinesEvents has key {
        game_started_events: EventHandle<GameStartedEvent>,
        tile_revealed_events: EventHandle<TileRevealedEvent>,
        game_won_events: EventHandle<GameWonEvent>,
        game_lost_events: EventHandle<GameLostEvent>,
        cashout_events: EventHandle<CashoutEvent>,
    }

    /// Initialize the mines game
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
        move_to(account, MinesEvents {
            game_started_events: event::new_event_handle<GameStartedEvent>(account),
            tile_revealed_events: event::new_event_handle<TileRevealedEvent>(account),
            game_won_events: event::new_event_handle<GameWonEvent>(account),
            game_lost_events: event::new_event_handle<GameLostEvent>(account),
            cashout_events: event::new_event_handle<CashoutEvent>(account),
        });
    }

    /// Start a new mines game
    public entry fun start_game(
        player: &signer,
        bet_amount: u64,
        mines_count: u8,
        tiles_to_reveal: u8,
    ) acquires GameState, MinesEvents {
        let player_addr = signer::address_of(player);
        
        // Validate parameters
        assert!(bet_amount > 0, EINVALID_AMOUNT);
        assert!(mines_count >= 1 && mines_count <= 24, EINVALID_MINES_COUNT);
        assert!(tiles_to_reveal >= 1 && tiles_to_reveal <= 25, EINVALID_TILES_COUNT);
        assert!(mines_count + tiles_to_reveal <= 25, EINVALID_TILES_COUNT);
        
        // Check if player has active game
        assert!(!exists<PlayerGame>(player_addr), EGAME_ALREADY_ACTIVE);
        
        // Withdraw player's APT
        let player_coins = coin::withdraw<AptosCoin>(player, bet_amount);
        
        // Get game state
        let game_state = borrow_global_mut<GameState>(@apt_casino);
        game_state.current_game_id = game_state.current_game_id + 1;
        game_state.total_games = game_state.total_games + 1;
        game_state.total_volume = game_state.total_volume + bet_amount;
        
        // Generate mine positions
        let mine_positions = generate_mine_positions(mines_count);
        
        // Calculate initial multiplier
        let multiplier = calculate_multiplier(mines_count, tiles_to_reveal, 0);
        
        // Create player game
        let player_game = PlayerGame {
            game_id: game_state.current_game_id,
            player: player_addr,
            bet_amount,
            mines_count,
            tiles_to_reveal,
            revealed_tiles: vector::empty(),
            mine_positions,
            game_active: true,
            multiplier,
            start_time: timestamp::now_seconds(),
        };
        
        // Store player game
        move_to(player, player_game);
        
        // Emit game started event
        let events = borrow_global_mut<MinesEvents>(@apt_casino);
        event::emit_event(&mut events.game_started_events, GameStartedEvent {
            game_id: game_state.current_game_id,
            player: player_addr,
            bet_amount,
            mines_count,
            tiles_to_reveal,
        });
    }

    /// Reveal a tile
    public entry fun reveal_tile(
        player: &signer,
        tile_index: u8,
    ) acquires PlayerGame, MinesEvents {
        let player_addr = signer::address_of(player);
        
        // Validate tile index
        assert!(tile_index >= 0 && tile_index < 25, EINVALID_TILE_INDEX);
        
        // Get player game
        assert!(exists<PlayerGame>(player_addr), ENO_GAME_FOUND);
        let player_game = borrow_global_mut<PlayerGame>(player_addr);
        assert!(player_game.game_active, ENO_GAME_ACTIVE);
        
        // Check if tile already revealed
        let i = 0;
        while (i < vector::length(&player_game.revealed_tiles)) {
            assert!(*vector::borrow(&player_game.revealed_tiles, i) != tile_index, ETILE_ALREADY_REVEALED);
            i = i + 1;
        };
        
        // Check if tile is a mine
        let is_mine = false;
        let j = 0;
        while (j < vector::length(&player_game.mine_positions)) {
            if (*vector::borrow(&player_game.mine_positions, j) == tile_index) {
                is_mine = true;
                break
            };
            j = j + 1;
        };
        
        if (is_mine) {
            // Game lost - hit a mine
            player_game.game_active = false;
            
            // Emit game lost event
            let events = borrow_global_mut<MinesEvents>(@apt_casino);
            event::emit_event(&mut events.game_lost_events, GameLostEvent {
                game_id: player_game.game_id,
                player: player_addr,
                bet_amount: player_game.bet_amount,
                mine_position: tile_index,
            });
            
            // Update global stats
            let game_state = borrow_global_mut<GameState>(@apt_casino);
            game_state.total_losses = game_state.total_losses + 1;
            
        } else {
            // Tile is safe - add to revealed tiles
            vector::push_back(&mut player_game.revealed_tiles, tile_index);
            
            // Update multiplier
            let new_multiplier = calculate_multiplier(
                player_game.mines_count,
                player_game.tiles_to_reveal,
                vector::length(&player_game.revealed_tiles)
            );
            player_game.multiplier = new_multiplier;
            
            // Emit tile revealed event
            let events = borrow_global_mut<MinesEvents>(@apt_casino);
            event::emit_event(&mut events.tile_revealed_events, TileRevealedEvent {
                game_id: player_game.game_id,
                player: player_addr,
                tile_index,
                is_mine: false,
                multiplier: new_multiplier,
            });
            
            // Check if all tiles revealed
            if (vector::length(&player_game.revealed_tiles) >= player_game.tiles_to_reveal) {
                // Game won
                player_game.game_active = false;
                
                let winnings = player_game.bet_amount * new_multiplier / 10000;
                
                // Emit game won event
                event::emit_event(&mut events.game_won_events, GameWonEvent {
                    game_id: player_game.game_id,
                    player: player_addr,
                    bet_amount: player_game.bet_amount,
                    winnings,
                    multiplier: new_multiplier,
                });
                
                // Update global stats
                let game_state = borrow_global_mut<GameState>(@apt_casino);
                game_state.total_wins = game_state.total_wins + 1;
            };
        };
    }

    /// Cashout current game
    public entry fun cashout(player: &signer) acquires PlayerGame, MinesEvents {
        let player_addr = signer::address_of(player);
        
        // Get player game
        assert!(exists<PlayerGame>(player_addr), ENO_GAME_FOUND);
        let player_game = borrow_global_mut<PlayerGame>(player_addr);
        assert!(player_game.game_active, ENO_GAME_ACTIVE);
        assert!(vector::length(&player_game.revealed_tiles) > 0, ENO_GAME_ACTIVE);
        
        // Calculate winnings
        let winnings = player_game.bet_amount * player_game.multiplier / 10000;
        
        // Transfer winnings to player
        let winnings_coins = coin::withdraw<AptosCoin>(&account::create_signer_with_capability(&get_capability()), winnings);
        coin::deposit(player_addr, winnings_coins);
        
        // Mark game as inactive
        player_game.game_active = false;
        
        // Emit cashout event
        let events = borrow_global_mut<MinesEvents>(@apt_casino);
        event::emit_event(&mut events.cashout_events, CashoutEvent {
            game_id: player_game.game_id,
            player: player_addr,
            bet_amount: player_game.bet_amount,
            winnings,
            multiplier: player_game.multiplier,
        });
        
        // Update global stats
        let game_state = borrow_global_mut<GameState>(@apt_casino);
        game_state.total_wins = game_state.total_wins + 1;
    }

    /// Generate mine positions using on-chain randomness
    fun generate_mine_positions(mines_count: u8): vector<u8> {
        let mine_positions = vector::empty<u8>();
        let used_positions = vector::empty<u8>();
        
        let i = 0;
        while (i < mines_count) {
            let position = generate_random_position(&used_positions);
            vector::push_back(&mut mine_positions, position);
            vector::push_back(&mut used_positions, position);
            i = i + 1;
        };
        
        mine_positions
    }

    /// Generate random position (0-24) that hasn't been used
    fun generate_random_position(used_positions: &vector<u8>): u8 {
        let seed = vector::empty<u8>();
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_seconds()));
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_microseconds()));
        
        let hash = hash::sha3_256(seed);
        let random_value = 0;
        let j = 0;
        while (j < 8) {
            random_value = random_value + (*vector::borrow(&hash, j) as u64);
            j = j + 1;
        };
        
        let position = (random_value % 25) as u8;
        
        // Check if position already used
        let k = 0;
        while (k < vector::length(used_positions)) {
            if (*vector::borrow(used_positions, k) == position) {
                // Recursively generate new position
                return generate_random_position(used_positions)
            };
            k = k + 1;
        };
        
        position
    }

    /// Calculate multiplier based on mines count, tiles to reveal, and revealed tiles
    fun calculate_multiplier(mines_count: u8, tiles_to_reveal: u8, revealed_tiles: u64): u64 {
        // Base multiplier calculation
        // This is a simplified version - in a real implementation, you'd use more complex math
        let base_multiplier = 10000; // 1.0x
        
        if (revealed_tiles == 0) {
            return base_multiplier
        };
        
        // Calculate probability of not hitting a mine
        let remaining_tiles = 25 - revealed_tiles;
        let remaining_mines = mines_count;
        let safe_tiles = remaining_tiles - remaining_mines;
        
        if (safe_tiles <= 0) {
            return base_multiplier
        };
        
        // Calculate multiplier based on probability
        let probability = (safe_tiles as u64) * 10000 / (remaining_tiles as u64);
        let multiplier = base_multiplier * 10000 / probability;
        
        multiplier
    }

    /// Get capability for resource account
    fun get_capability(): account::SignerCapability {
        let capability = borrow_global<MinesCapability>(@apt_casino);
        capability.signer_cap
    }

    /// Get game state
    public fun get_game_state(): (bool, u64, u64, u64, u64, u64) acquires GameState {
        let game_state = borrow_global<GameState>(@apt_casino);
        (game_state.active, game_state.current_game_id, game_state.total_games, game_state.total_volume, game_state.total_wins, game_state.total_losses)
    }

    /// Get player game
    public fun get_player_game(player_addr: address): (u64, address, u64, u8, u8, vector<u8>, bool, u64) acquires PlayerGame {
        assert!(exists<PlayerGame>(player_addr), ENO_GAME_FOUND);
        let player_game = borrow_global<PlayerGame>(player_addr);
        (player_game.game_id, player_game.player, player_game.bet_amount, player_game.mines_count, player_game.tiles_to_reveal, player_game.revealed_tiles, player_game.game_active, player_game.multiplier)
    }

    /// Check if player has active game
    public fun has_active_game(player_addr: address): bool {
        exists<PlayerGame>(player_addr)
    }
}

/// Capability for resource account
struct MinesCapability has key {
    signer_cap: account::SignerCapability,
} 