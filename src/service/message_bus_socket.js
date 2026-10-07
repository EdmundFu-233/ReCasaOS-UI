import {api} from "./service.js";

// Bus subscription with a one-use ticket
// - POST /v2/message_bus/ticket (normal Authorization) → HttpOnly cookie; next handshake redeems it
// - (no Authorization header on browser WebSockets; no tokens in URLs)
// - fresh ticket before every (re)connect; replaces socket.io reconnection (would reuse a spent ticket)

const MIN_DELAY = 1000
const MAX_DELAY = 30000
const SIGNED_OUT_POLL = 2000

export function connectMessageBus(socket) {
	let delay = MIN_DELAY
	let timer = null

	const retry = (after) => {
		clearTimeout(timer)
		timer = setTimeout(open, after)
	}

	const backOff = () => {
		retry(delay)
		delay = Math.min(delay * 2, MAX_DELAY)
	}

	async function open() {
		if (socket.connected) {
			return
		}
		// not logged in yet
		if (!localStorage.getItem("access_token")) {
			retry(SIGNED_OUT_POLL)
			return
		}
		try {
			await api.post("/v2/message_bus/ticket")
			socket.open()
		} catch (e) {
			backOff()
		}
	}

	socket.on("connect", () => {
		delay = MIN_DELAY
	})
	socket.on("connect_error", backOff)
	socket.on("disconnect", (reason) => {
		if (reason !== "io client disconnect") {
			backOff()
		}
	})

	open()
}
