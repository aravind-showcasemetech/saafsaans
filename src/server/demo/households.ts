import type { HouseholdProfile } from "../../shared/schemas.js";

export interface DemoHouseholdEntry {
  id: string;
  name: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  description: string;
  profile: HouseholdProfile;
}

export const demoHouseholds: Record<string, DemoHouseholdEntry> = {
  "the-reddys": {
    id: "the-reddys",
    name: "The Reddys",
    location: {
      name: "Kukatpally, Hyderabad",
      lat: 17.48,
      lng: 78.41,
    },
    description:
      "Father drives petrol car to HITEC City; mother WFH; son (9) with asthma; grandmother (68) walks at 6 am. Incense daily, mosquito coil at night, no purifier.",
    profile: {
      members: [
        {
          id: "m-father",
          nickname: "Father",
          ageBand: "31-40",
          sensitivity: "none",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 0,
        },
        {
          id: "m-mother",
          nickname: "Mother",
          ageBand: "31-40",
          sensitivity: "none",
          routinePreset: "work_from_home",
          outdoorExerciseMinutes: 0,
        },
        {
          id: "m-son",
          nickname: "Son (9)",
          ageBand: "6-10",
          sensitivity: "asthma_copd",
          routinePreset: "school_child",
          outdoorExerciseMinutes: 30,
        },
        {
          id: "m-grandmother",
          nickname: "Grandmother (68)",
          ageBand: "61-70",
          sensitivity: "none",
          routinePreset: "retired",
          outdoorExerciseMinutes: 60,
          outdoorExerciseTime: "06:00",
        },
      ],
      commute: {
        mode: "petrol_car",
        distanceKm: 12,
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 5,
        startPlace: "Kukatpally",
        endPlace: "HITEC City",
      },
      home: {
        bedroomAreaSqFt: 144, // 12x12
        ceilingHeightFt: 10,
        windowHabit: "mostly_shut",
        hasPurifier: false,
        cookingMethod: "gas",
        usesIncense: true,
        usesMosquitoCoils: true,
        smokerInHouse: false,
      },
    },
  },
  "ayesha-and-karthik": {
    id: "ayesha-and-karthik",
    name: "Ayesha and Karthik",
    location: {
      name: "Gachibowli, Hyderabad",
      lat: 17.44,
      lng: 78.35,
    },
    description: "Both in IT, one two-wheeler, morning run; Ayesha is pregnant.",
    profile: {
      members: [
        {
          id: "m-ayesha",
          nickname: "Ayesha",
          ageBand: "16-30",
          sensitivity: "pregnancy",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 30,
          outdoorExerciseTime: "06:30",
        },
        {
          id: "m-karthik",
          nickname: "Karthik",
          ageBand: "31-40",
          sensitivity: "none",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 45,
          outdoorExerciseTime: "06:30",
        },
      ],
      commute: {
        mode: "scooter",
        distanceKm: 8,
        tripsPerDay: 2,
        peopleSharing: 2,
        workingDaysPerWeek: 5,
        startPlace: "Gachibowli",
        endPlace: "HITEC City",
      },
      home: {
        bedroomAreaSqFt: 150,
        ceilingHeightFt: 10,
        windowHabit: "open_day_shut_night",
        hasPurifier: false,
        cookingMethod: "induction",
        usesIncense: false,
        usesMosquitoCoils: false,
        smokerInHouse: false,
      },
    },
  },
  "the-khans": {
    id: "the-khans",
    name: "The Khans",
    location: {
      name: "Near Charminar, Hyderabad",
      lat: 17.36,
      lng: 78.47,
    },
    description:
      "Father drives auto (outdoors all day); two children walk to school; lots of frying, small home, no purifier.",
    profile: {
      members: [
        {
          id: "m-father",
          nickname: "Father",
          ageBand: "41-60",
          sensitivity: "none",
          routinePreset: "outdoor_worker",
          outdoorExerciseMinutes: 0,
        },
        {
          id: "m-child1",
          nickname: "Elder Child (12)",
          ageBand: "11-15",
          sensitivity: "none",
          routinePreset: "school_child",
          outdoorExerciseMinutes: 20,
        },
        {
          id: "m-child2",
          nickname: "Younger Child (7)",
          ageBand: "6-10",
          sensitivity: "none",
          routinePreset: "school_child",
          outdoorExerciseMinutes: 20,
        },
      ],
      commute: {
        mode: "auto",
        distanceKm: 2,
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 6,
        startPlace: "Charminar",
        endPlace: "Old City",
      },
      home: {
        bedroomAreaSqFt: 100,
        ceilingHeightFt: 9,
        windowHabit: "mostly_open",
        hasPurifier: false,
        cookingMethod: "lots_of_frying",
        usesIncense: false,
        usesMosquitoCoils: false,
        smokerInHouse: false,
      },
    },
  },
  "green-meadows": {
    id: "green-meadows",
    name: "Green Meadows society",
    location: {
      name: "Kondapur, Hyderabad",
      lat: 17.46,
      lng: 78.36,
    },
    description: "120 homes community sharing collective clean-air action.",
    profile: {
      members: [
        {
          id: "m-rep",
          nickname: "Society Member",
          ageBand: "31-40",
          sensitivity: "none",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 30,
        },
      ],
      commute: {
        mode: "petrol_car",
        distanceKm: 10,
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 5,
        startPlace: "Kondapur",
        endPlace: "HITEC City",
      },
      home: {
        bedroomAreaSqFt: 180,
        ceilingHeightFt: 10,
        windowHabit: "mostly_shut",
        hasPurifier: true,
        purifierCadrCfm: 150,
        cookingMethod: "gas",
        usesIncense: false,
        usesMosquitoCoils: false,
        smokerInHouse: false,
      },
    },
  },
  "the-sharmas": {
    id: "the-sharmas",
    name: "The Sharmas",
    location: {
      name: "Dwarka, Delhi",
      lat: 28.58,
      lng: 77.05,
    },
    description: "Family of four in Dwarka, Delhi on a Severe winter day.",
    profile: {
      members: [
        {
          id: "m-father",
          nickname: "Father",
          ageBand: "41-60",
          sensitivity: "none",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 0,
        },
        {
          id: "m-mother",
          nickname: "Mother",
          ageBand: "41-60",
          sensitivity: "asthma_copd",
          routinePreset: "office_worker",
          outdoorExerciseMinutes: 0,
        },
        {
          id: "m-child",
          nickname: "Teenager (15)",
          ageBand: "11-15",
          sensitivity: "none",
          routinePreset: "school_child",
          outdoorExerciseMinutes: 30,
        },
        {
          id: "m-grandparent",
          nickname: "Grandfather (72)",
          ageBand: "71-plus",
          sensitivity: "heart_condition",
          routinePreset: "retired",
          outdoorExerciseMinutes: 30,
          outdoorExerciseTime: "07:00",
        },
      ],
      commute: {
        mode: "diesel_car",
        distanceKm: 15,
        tripsPerDay: 2,
        peopleSharing: 1,
        workingDaysPerWeek: 5,
        startPlace: "Dwarka",
        endPlace: "Connaught Place",
      },
      home: {
        bedroomAreaSqFt: 160,
        ceilingHeightFt: 10,
        windowHabit: "mostly_shut",
        hasPurifier: true,
        purifierCadrCfm: 180,
        cookingMethod: "gas",
        usesIncense: false,
        usesMosquitoCoils: false,
        smokerInHouse: false,
      },
    },
  },
};
