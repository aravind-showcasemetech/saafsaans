import { Hono } from "hono";
import { demoHouseholds } from "../demo/households.js";

export const demoRoute = new Hono();

// GET /api/demo/households: returns list of demo households without nicknames
demoRoute.get("/demo/households", (c) => {
  const households = Object.values(demoHouseholds).map((entry) => {
    // Strip nickname from each member
    const anonymisedMembers = entry.profile.members.map((m, idx) => ({
      id: `m${idx + 1}`,
      ageBand: m.ageBand,
      sensitivity: m.sensitivity,
      routinePreset: m.routinePreset,
      outdoorExerciseMinutes: m.outdoorExerciseMinutes,
      outdoorExerciseTime: m.outdoorExerciseTime,
      customRoutine: m.customRoutine,
    }));

    return {
      id: entry.id,
      name: entry.name,
      location: entry.location,
      description: entry.description,
      profile: {
        ...entry.profile,
        members: anonymisedMembers,
      },
      // Nickname mapping preserved for client storage if using demo
      nicknames: Object.fromEntries(
        entry.profile.members.map((m, idx) => [`m${idx + 1}`, m.nickname || `Member ${idx + 1}`]),
      ),
    };
  });

  return c.json(households);
});
