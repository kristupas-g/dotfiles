-- Drives FortiClient's VPN page: `vpn.applescript <profile> Connect` or
-- `... Disconnect`. FortiClient is an Electron app with no connect command or
-- URL, so this presses its buttons; it needs Accessibility permission for the
-- app running it (Herdr).
--
-- The VPN page (with "All VPNs" in view) lists each profile as a label
-- followed by its own Connect (or Disconnect) button, so the one to press is
-- the first button with that name after the label with the profile's name.
-- Electron only builds its web accessibility tree once asked
-- (AXManualAccessibility), and only for a window that already exists, so the
-- window is waited for first and the attribute set again on every try.
on run argv
	set profileName to item 1 of argv
	set btn to item 2 of argv
	tell application "FortiClient" to activate
	delay 1
	tell application "System Events"
		tell process "FortiClient"
			set frontmost to true
			repeat 20 times
				if (count of windows) > 0 then exit repeat
				delay 0.5
			end repeat
			if (count of windows) = 0 then error "FortiClient has no window"
			set labels to ""
			repeat 8 times
				try
					set value of attribute "AXManualAccessibility" to true
				end try
				delay 1.5
				repeat with w in windows
					set els to entire contents of w
					set found to false
					repeat with e in els
						try
							set r to role of e
							if r is "AXStaticText" then
								set v to ""
								try
									set v to value of e as text
								end try
								if v is profileName then
									set found to true
								else if v is not "" and found is false then
									set labels to labels & v & "; "
								end if
							else if r is "AXButton" and found then
								set n to ""
								try
									set n to name of e as text
								end try
								if n is btn then
									click e
									return btn & " pressed for " & profileName
								end if
							end if
						end try
					end repeat
				end repeat
			end repeat
			error "No " & btn & " button for \"" & profileName & "\" in FortiClient's window. Labels seen: " & labels
		end tell
	end tell
end run
