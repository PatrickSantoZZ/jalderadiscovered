const Command = require('command');
const os = require('os');

const state = global.balderaDiscovered = global.balderaDiscovered || {};

const enterPortal = {
  gameId: {
    low: 0x00000001,
    high: 0x0BA1DE7A,
    unsigned: true
  },
  loc: {
    x: 122125,
    y: 15417,
    z: 2271
  },
  w: -0.7830,
  templateId: 1003,
  huntingZoneId: 873,
  spawnType: 2,
}

const exitPortal = {
  gameId: {
    low: 0x00000002,
    high: 0x0BA1DE7A,
    unsigned: true
  },
  loc: {
    x: 122325,
    y: 15190,
    z: 2241
  },
  w: -0.7830,
  templateId: 1007,
  huntingZoneId: 873,
  spawnType: 2,
}

module.exports = function BalderaDiscovered(dispatch) {
  const command = new Command(dispatch);

  function visuallyMoveTo(loc, w) {
    dispatch.toClient('S_INSTANT_MOVE', 3, {
      gameId: state.playerGameID,
      loc: loc,
      w: state.lastPlayerPositionUpdate.w,
    })
  }

  function despawnNPC(gameId, despawnType) {
    dispatch.toClient('S_DESPAWN_NPC', 3, {
      gameId: gameId,
      loc: {
        x: 0,
        y: 0,
        z: 0
      },
      type: despawnType,
      unk: 0,
    });
  }

  function spawnNPC(gameId, position, rotation, templateId, huntingZoneId, spawnType) {
    dispatch.toClient('S_SPAWN_NPC', 11, {
      gameId: gameId,
      target: {
        low: 0,
        high: 0,
        unsigned: true
      },
      loc: position,
      w: rotation,
      relation: 12,
      templateId: templateId,
      huntingZoneId: huntingZoneId,
      unk1: 0, // shapeID
      walkSpeed: 60,
      runSpeed: 110,
      unk5: 0,
      unk6: 0,
      unk7: 5,
      visible: true,
      villager: true,
      spawnType: spawnType, // 1=instant, 2 = with sound and effects
      unk11: {
        low: 0,
        high: 0,
        unsigned: true
      },
      unk12: 0,
      unk13: 0,
      unk14: 0,
      unk15: 0,
      owner: {
        low: 0,
        high: 0,
        unsigned: true
      },
      unk16: 0,
      unk17: 0,
      unk18: {
        low: 0,
        high: 0,
        unsigned: true
      },
      unk19: 0,
      unk20: 16777216, // Some flag 0x1000000
      unk25: 16777216, // Some flag 0x1000000
      unk22: [],
      unk24: [],
      npcName: 'xxx'
    });
  }

  // Delete old NPCs if they exist
  function cleanupStaticNPCs() {
    despawnNPC(enterPortal.gameId, 1);
    despawnNPC(exitPortal.gameId, 1);
  }

  function addStaticNPCs() {
    spawnNPC(enterPortal.gameId, enterPortal.loc, enterPortal.w, enterPortal.templateId, enterPortal.huntingZoneId, enterPortal.spawnType);
    spawnNPC(exitPortal.gameId, exitPortal.loc, exitPortal.w, exitPortal.templateId, exitPortal.huntingZoneId, exitPortal.spawnType);
  }


  dispatch.hook('S_LOGIN', 13, event => {
    state.playerGameID = event.gameId;
  })

  dispatch.hook('C_NPC_CONTACT', 2, event => {
    if (event.gameId.equals(enterPortal.gameId)) {
      // Trying to use enter portal, teleport to inside, turn off position update, and cancel this packet.
      visuallyMoveTo(exitPortal.loc);
      state.insideBaldera = true;
      return false;
    } else if (event.gameId.equals(exitPortal.gameId)) {
      // Trying to use exit portal, teleport to outside, turn on position update, and cancel this packet.
      visuallyMoveTo(enterPortal.loc);
      state.insideBaldera = false;
      return false;
    }
  });

  dispatch.hook('C_PLAYER_LOCATION', 5, event => {
    state.lastPlayerPositionUpdate = event;

    // Don't send real position updates if player is inside of baldera.
    if (state.insideBaldera) {
      console.log("Player inside baldera: Skip C_PLAYER_LOCATION");
      return false;
    }
  });

  dispatch.hook('C_SELECT_CHANNEL', '*', event => {
    // Don't allow channel change inside of baldera.
    if (state.insideBaldera) {
      console.log("Player inside baldera: Skip C_SELECT_CHANNEL");
      return false;
    }
  });

  command.add('discover', (arg) => {
    cleanupStaticNPCs();
    addStaticNPCs();
    console.log("discover command called!");
  });

  this.destructor = function () {
    command.remove('discover');
  };
};