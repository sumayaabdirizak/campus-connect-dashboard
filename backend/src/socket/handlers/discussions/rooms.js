const DISCUSSION_ROOM_PREFIX = "discussion:group:";
const DISCUSSION_CHANNEL_ROOM_PREFIX = "channel:";
const DISCUSSION_GROUP_DM_ROOM_PREFIX = "groupdm:";

/**
 * @param {import("socket.io").Server} io
 */
export function createDiscussionRoomHelpers(io) {
  const userDiscussionRooms = new Map();
  const userGroupDmRooms = new Map();

  function discussionRoom(groupId) {
    return `${DISCUSSION_ROOM_PREFIX}${Number(groupId)}`;
  }

  function discussionChannelRoom(channelId) {
    return `${DISCUSSION_CHANNEL_ROOM_PREFIX}${Number(channelId)}`;
  }

  function discussionGroupDmRoom(groupDmId) {
    return `${DISCUSSION_GROUP_DM_ROOM_PREFIX}${Number(groupDmId)}`;
  }

  function rememberDiscussionRoom(userId, groupId) {
    const key = Number(userId);
    const set = userDiscussionRooms.get(key) ?? new Set();
    set.add(Number(groupId));
    userDiscussionRooms.set(key, set);
  }

  function forgetDiscussionRoom(userId, groupId) {
    const key = Number(userId);
    const set = userDiscussionRooms.get(key);
    if (!set) return;
    set.delete(Number(groupId));
    if (set.size === 0) userDiscussionRooms.delete(key);
  }

  function getRememberedDiscussionRooms(userId) {
    return Array.from(userDiscussionRooms.get(Number(userId)) ?? []);
  }

  function rememberGroupDmRoom(userId, groupDmId) {
    const key = Number(userId);
    const set = userGroupDmRooms.get(key) ?? new Set();
    set.add(Number(groupDmId));
    userGroupDmRooms.set(key, set);
  }

  function forgetGroupDmRoom(userId, groupDmId) {
    const key = Number(userId);
    const set = userGroupDmRooms.get(key);
    if (!set) return;
    set.delete(Number(groupDmId));
    if (set.size === 0) userGroupDmRooms.delete(key);
  }

  function getRememberedGroupDmRooms(userId) {
    return Array.from(userGroupDmRooms.get(Number(userId)) ?? []);
  }

  function getUserSockets(userId) {
    const sockets = [];
    for (const [, s] of io.sockets.sockets) {
      if (Number(s.data?.user?.id) === Number(userId)) sockets.push(s);
    }
    return sockets;
  }

  function isUserViewingGroup(userId, groupId) {
    return getUserSockets(userId).some(
      (s) => Number(s.data?.activeDiscussionGroupId) === Number(groupId)
    );
  }

  function isUserViewingChannel(userId, channelId) {
    return getUserSockets(userId).some(
      (s) => Number(s.data?.activeDiscussionChannelId) === Number(channelId)
    );
  }

  function isUserViewingGroupDm(userId, groupDmId) {
    return getUserSockets(userId).some(
      (s) => Number(s.data?.activeDiscussionGroupDmId) === Number(groupDmId)
    );
  }

  return {
    discussionRoom,
    discussionChannelRoom,
    discussionGroupDmRoom,
    rememberDiscussionRoom,
    forgetDiscussionRoom,
    getRememberedDiscussionRooms,
    rememberGroupDmRoom,
    forgetGroupDmRoom,
    getRememberedGroupDmRooms,
    getUserSockets,
    isUserViewingGroup,
    isUserViewingChannel,
    isUserViewingGroupDm,
  };
}

export function ackOrEmitError(socket, ack, code, message, extra = {}) {
  const payload = { ok: false, code, message, ...extra };
  if (typeof ack === "function") return ack(payload);
  socket.emit("ws:error", payload);
}

export function ackSuccess(ack, payload = {}) {
  if (typeof ack === "function") ack({ ok: true, ...payload });
}
