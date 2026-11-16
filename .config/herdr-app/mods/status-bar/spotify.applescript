-- spotify.applescript: the status bar's Spotify control, through the desktop
-- app's own scripting (no login, no network). Run with one command:
--   state                the player: "off" when Spotify isn't running, else
--                        on / player state / track / artist / artwork url /
--                        volume / shuffling / track id, one per line
--   playpause | play | next | previous   act on the player
--   shuffle <true|false>  set shuffle
--   volume <0-100>       set the player's volume
-- "is running" never launches Spotify; the status bar's "Turn on the grooves"
-- opens it with `open -g -a Spotify` and then sends `play`.

on run argv
	set cmd to item 1 of argv
	if not (application "Spotify" is running) then
		if cmd is "state" then return "off"
		error "Spotify isn't running" number 1
	end if
	tell application "Spotify"
		if cmd is "state" then
			set ps to player state as text
			set tn to ""
			set ta to ""
			set tu to ""
			set ti to ""
			try
				set tn to name of current track
				set ta to artist of current track
				set tu to artwork url of current track
				set ti to id of current track
			end try
			return "on" & linefeed & ps & linefeed & tn & linefeed & ta & linefeed & tu & linefeed & (sound volume as text) & linefeed & (shuffling as text) & linefeed & ti
		else if cmd is "playpause" then
			playpause
		else if cmd is "play" then
			play
		else if cmd is "next" then
			next track
		else if cmd is "previous" then
			previous track
		else if cmd is "shuffle" then
			-- explicit, not "not shuffling": Spotify answers with the old value while a change is still applying
			set shuffling to (item 2 of argv is "true")
		else if cmd is "volume" then
			set sound volume to (item 2 of argv as integer)
		else
			error "unknown command " & cmd number 2
		end if
	end tell
	return "ok"
end run
