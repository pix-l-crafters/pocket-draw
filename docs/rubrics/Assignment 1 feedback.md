# Assignment 1

Really like the idea a lot, I defo think it has potential to be a "viral-esque" mini game I'd see in my feed, a BLE reflex duel where the phone is a prop and you win with a physical movement is something a tap-based app just can't be.

Biggest hurdle for the project is getting that real-time 2 phone buzz at the same time, cause not sure if bluetooth could allow that same timing on multiple devices, worth to take a look at and be the main focus to tackle as soon as possible.
I'd move your week one spike from "can we connect" to "can we get two phones to buzz within 20ms of each other, measured", because that's the actual hard problem and a measured number is a far better feasibility story than what's in the report right now.
In a reaction game that timing isn't a rounding error, it's the whole product.
Worth pulling those seven undecided mechanics forward out of weeks 7 to 8 as well, the fire gesture and the tie threshold especially, since you can't really write sensor code against a rule nobody has settled yet.

Report wise, the A2 rubric addressment isn't quite up to what the rubric mentioned, your Section 4 is mapping against the unit's eligibility conditions rather than the actual A2 criteria, so would need to adjust for the final report to make it more itemized.
Swap that left column for the real criteria and most of the gaps will follow on their own, and there are no UI section at all currently which is a decent chunk of marks just sitting there.

Contribution is the other big one.
Each member has a two to four word cell ("Map + Duel", "Backend + Duel") and then a line saying the full task by task breakdown gets filled in once work is assigned, which against a criterion asking for itemised and specific contributions is the exact thing it's there to catch.
Section 9 helps a bit but ownership is stated in pairs so nobody owns anything alone, and the Product area (onboarding, empty states, demo script, leaderboard) is marked "Unassigned. No owner yet, needs to be picked up".
Your GitHub board apparently already has the tickets on it, so exporting four or five deliverables per named member from it is about an hour of work and gets most of those marks back.
