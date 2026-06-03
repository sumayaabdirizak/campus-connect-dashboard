/**
 * Quiz live-monitor socket handlers, extracted from server.js.
 *
 * Teachers subscribe to `quiz:${quizId}:monitor` to receive real-time progress
 * events as students take the quiz (emitted from the quiz-taking controller via
 * getIo()). Access is RBAC-checked on join — only a user with manage rights on
 * the underlying course offering can listen; students cannot subscribe (it
 * would leak peers' answer progress).
 *
 * Stateless per-socket (room membership is tracked on socket.data and torn down
 * automatically by Socket.IO on disconnect), so this is a plain register fn —
 * no factory / shared state needed.
 */
export function registerQuizMonitorHandlers(socket) {
  socket.on("quiz:monitor:join", async (quizId, ack) => {
    try {
      const qid = Number(quizId);
      if (!Number.isFinite(qid)) {
        if (typeof ack === "function") ack({ ok: false, error: "bad_quiz_id" });
        return;
      }
      const { fetchQuizWithOffering, canManageOfferingContent } = await import(
        "../../utils/courseOfferingAccess.js"
      );
      const quiz = await fetchQuizWithOffering(qid);
      if (!quiz) {
        if (typeof ack === "function") ack({ ok: false, error: "not_found" });
        return;
      }
      const allowed = await canManageOfferingContent(socket.data.user, quiz.courseOffering);
      if (!allowed) {
        if (typeof ack === "function") ack({ ok: false, error: "forbidden" });
        return;
      }
      const room = `quiz:${qid}:monitor`;
      socket.join(room);
      socket.data.quizMonitorRooms = socket.data.quizMonitorRooms || new Set();
      socket.data.quizMonitorRooms.add(qid);
      if (typeof ack === "function") ack({ ok: true, room });
    } catch (e) {
      console.warn("[quiz-monitor] join failed:", e.message);
      if (typeof ack === "function") ack({ ok: false, error: "server_error" });
    }
  });

  socket.on("quiz:monitor:leave", (quizId) => {
    const qid = Number(quizId);
    if (!Number.isFinite(qid)) return;
    socket.leave(`quiz:${qid}:monitor`);
    socket.data.quizMonitorRooms?.delete(qid);
  });
}
