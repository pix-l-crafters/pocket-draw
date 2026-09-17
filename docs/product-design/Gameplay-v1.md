# Gameplay

Once the challenge is initiated, a new game screen is displayed.

This screen shows instructions on how to play the game.

1. Players will raise their phones at shoulder level. The game will record sensor data. Mainly the spatial coordinates and orientation of the phone.
   The phone's upper edge should point towards the opponent. And the lower edge should be parallel to the ground.

2. Players will then move arm straight down with their phones pointing towards ground. I.e. a 90 degree angle rotation downwards from earlier shoulder position. Sensor data will be recorded again.

3. Once sensor data is recorded from both positions, the game will calibrate the "rest" position and "fire" position. The "fire" position will be the shoulder level position, and the "rest" position will be the arm downwards position.

4. There will be 3 rounds per match. Once the scores are tallied, the winner is determined by the highest score.
   a. If it results in Tie, a tie breaker round is initiated. Whatever the result of tie breaker, the match ends and the scores of the entire match is saved, be it win/lose/tie.

5. When the phones are down, the game will begin a count down timer of 3 seconds. Once the timer is out, the phone will buzz which is an indicator that the players should now shoot.

6. Players will then raise their arm and shoot (auto shoots when phone reaches shoulder position). Body shot counts as 1 point. Headshot as 2 points. Misfire and wrong shots count as 0 points.

## Sensors

Two positions are vital to calibrate the gameplay.

1. Arm raised at shoulder position with the phone's top edge pointing the opponent. Let's call this the "shoulder" position.
2. Arm straight down with the phone's lower edge parallel/pointing to the ground. Let's call this the "ready" position.

These sensors help determine the spatial coordinates and orientation of the phone, which are used to determine the player's position and movement.

Whoever is the first to raise to shoulder level, wins.

## Winner Determination

According to sensor data, if the player raises their phone at shoulder level, the shot is considered valid and is counted as a hit. Any other shots are considered misses.

In the given round, player with fastest reaction time, wins.
