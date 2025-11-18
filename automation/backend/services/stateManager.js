const EventEmitter = require('events'); // <--- This was the missing line

// The Event Bus allows modules to listen for changes (like "Game Closed")
const eventBus = new EventEmitter();

// The single source of truth for who controls the lights
// Possible values: 'process', 'notification', or null (meaning TimeOfDay)
let currentOwner = null;

module.exports = {
    /**
     * Called by ProcessMonitor when a game starts.
     * Returns true if the override is granted.
     */
    requestProcessOverride: (processName) => {
        // Logic: We could block this if a critical notification is playing,
        // but usually games take priority over everything.
        
        currentOwner = 'process';
        console.log(`[StateManager] Control granted to process: ${processName}`);
        return true; 
    },

    /**
     * Called by ProcessMonitor when the game closes.
     */
    releaseProcessOverride: () => {
        // Only release if the process actually holds it
        if (currentOwner === 'process') {
            currentOwner = null;
            console.log('[StateManager] Process override released. Signaling restore...');
            
            // Tell TimeOfDay (and others) to wake up immediately
            eventBus.emit('state-restored');
        }
    },

    /**
     * Called by TimeOfDay to check if it's allowed to run.
     */
    canAmbientUpdate: () => {
        // ToD can only update if NOBODY else owns the keyboard
        return currentOwner === null;
    },
    
    // Expose the event emitter so other files can do: stateManager.events.on(...)
    events: eventBus
};