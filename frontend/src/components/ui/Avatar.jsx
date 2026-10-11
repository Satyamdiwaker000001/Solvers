import { useState } from "react";

function initial(name) {
  return String(name || "U").trim().slice(0, 1).toUpperCase();
}

/**
 * Avatar catalog referencing the unique assets saved in /public & /assets:
 * - avatar-girl-1.png (Female avatars)
 * - avatar-boy-1.png, avatar-boy-2.png, avatar-boy-3.png (Male avatars)
 * - avatar-hacker.png (Tech/Neutral avatar)
 */
const FEMALE_AVATARS = [
  "/avatar-girl-1.png",
];

const MALE_AVATARS = [
  "/avatar-boy-1.png",
  "/avatar-boy-2.png",
  "/avatar-boy-3.png",
  "/avatar-hacker.png",
];

// Expanded Indian and international female name roots & suffixes
const FEMALE_NAME_PATTERNS = [
  /\b(riya|priya|ananya|pooja|puja|sneha|isha|shreya|neha|tanvi|kavya|diya|aditi|simran|radhika|swati|meera|aarti|arti|kriti|sakshi|komal|nisha|divya|shikha|rashi|richa|preeti|priti|mansi|khushi|anushka|deepika|shraddha|alisha|zoya|aarohi|tanya|megha|vidhi|payal|alka|pallavi|surabhi|surbhi|sunita|geeta|gita|sita|rekha|urvashi|muskan|jyoti|anjali|muskaan|komal|kajal|sakshi|khushboo|tanisha|sonia|sonam|roshni|parul|rashmi|garima|dimple|chhavi|akansha|akanksha|gunjan|nandini|bhavna|mahima|shalini|rupa|shweta|monika|renuka|seema|rekha|namrata|kiran|deepa|sheetal|rupali|archana|savita|anita|mamta|vandana|harshita|ankita|sarita|saroj|priyanka)\b/i,
  /[a-z]+(i|ya|ka|na|ta|ha|shree|kumari|wati|mati|devi|preet|leen|meet)$/i,
];

/**
 * Deterministically assigns a unique avatar based on user id/login/name and gender detection.
 */
export function getDeterministicAvatar(nameOrLogin, genderHint) {
  const str = String(nameOrLogin || "user").trim().toLowerCase();
  
  // Detect if name matches known female patterns or explicit gender hint
  const isFemale =
    genderHint === "female" ||
    genderHint === "girl" ||
    FEMALE_NAME_PATTERNS.some((p) => p.test(str));

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }

  if (isFemale) {
    return FEMALE_AVATARS[hash % FEMALE_AVATARS.length];
  }

  return MALE_AVATARS[hash % MALE_AVATARS.length];
}

/** GitHub / App avatar with gender-aware unique asset fallback */
export function Avatar({ src, name, genderHint, className = "", alt }) {
  const [failed, setFailed] = useState(false);
  const fallbackAsset = getDeterministicAvatar(name, genderHint);

  const finalSrc = src && !failed ? src : fallbackAsset;

  return (
    <img
      src={finalSrc}
      alt={alt || `${name || "User"} profile`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!failed && src) setFailed(true);
      }}
      className={className}
    />
  );
}
