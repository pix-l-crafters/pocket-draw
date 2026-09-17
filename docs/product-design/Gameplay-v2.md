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

6. Players will then raise their arm and shoot (by pressing a button). Body shot counts as 1 point. Headshot as 2 points. Misfire and wrong shots count as 0 points.

## Sensors

Two positions are vital to calibrate the gameplay.

1. Arm raised at shoulder position with the phone's top edge pointing the opponent. Let's call this the "shoulder" position.
2. Arm straight down with the phone's lower edge parallel/pointing to the ground. Let's call this the "ready" position.

These sensors help determine the spatial coordinates and orientation of the phone, which are used to determine the player's position and movement.

The valid area where the shot is considered accepted is player's phone position from the ready position's height to the shoulder position's height. Any shots received in this area is counted as valid bodyshot.

Headshot area is the area from shoulder position's height to 15 centimeters above. Any shots received in this area is counted as valid headshot.

All other shots are considered misses.

## Winner Determination

According to sensor data, if the player shoots in valid bodyshot area or valid headshot area, the shot is considered valid and is counted as a hit. Any other shots are considered misses.

Headshot - 2 points
Body shot - 1 point
Miss - 0 points

Reaction time still decides who gets to score: whichever player shot faster is evaluated first. If their shot is a hit (bodyshot or headshot), they score those points and the round ends — the other player scores 0 regardless of where their own shot landed. If the faster player's shot is a miss, the slower player's shot is evaluated instead. If both players miss, the round is 0-0.

A false start (firing before the buzz) is a separate case from the above — it's a timing violation, not a scored shot, and is judged on its own regardless of where any shot would have landed.
