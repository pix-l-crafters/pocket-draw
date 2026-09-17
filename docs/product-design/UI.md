# UI

The interface has 4 tabs:

1. Map
2. Challenge
3. Leaderboards
4. Profile & Settings

The Challenge tab, when the challenge is accepted, launches the game instructions screen in full screen for the players to follow.
From that screen, the gameplay starts.

## Map

The map tab displays real world map with live locations of each player showing up as markers on the map.

This live data will get updated in real time (or with 1 second delay) as players move in real life.

## Challenge

This tab has 2 more sub tabs:

1. My QR
2. Scan

My QR - Shows the player's QR code. Primarily used by the challenger to join the game.

Scan - Allows the player to scan a QR code to join the game. Primarily used by the challenge receiver to join the game.

Players will join the game either via Bluetooth or via WebRTC. Challenger will initiate Personal WiFi Hotspot for WebRTC.
WebRTC is the primary means to connect.

Bluetooth is the fallback, considering differences in iOS & Android. We might end up not using bluetooth if WebRTC works better.

## Leaderboards

This section shows player leaderboards, where they can see their rank and statistics against other players.

## Profile & Settings

This section shows player profile, where they can customise their username.

Here they can also see their statistics.
The statistics are:

1. Number of wins
2. Number of losses
3. Number of draws
4. ELO Rating (low priority)
5. Average reaction time (do only when we have time)

And in settings they can log out of the game.
