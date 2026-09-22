export const studyCopy = {
  title: "I Am Not a Robot",
  subtitle: "An Adaptive Human Verification Study",
  purpose:
    "Complete a sequence of response and liveness tasks used to classify human and automated behavior.",
  disclosure: [
    "This is a fictional adult hypnosis and kink game presented as a psychology study.",
    "It includes automatic-response language, programming fantasy language, robot identity, audio-visual entrainment, and repeated first-person statements.",
    "This focused prototype takes approximately 8-12 minutes and works best without interruption.",
    "You can mute, pause, reduce visual intensity, or end the session at any time.",
  ],
  intensity: {
    reduced: {
      label: "Reduced",
      detail: "Slow motion, no flashing, lower contrast.",
    },
    standard: {
      label: "Standard",
      detail: "Smooth pulses, rotation, and gradual visual escalation.",
    },
    flashing: {
      label: "Flashing",
      detail: "Adds contained rhythmic flashes during later programming tasks.",
    },
  },
  recovery: [
    {
      text:
        "The verification protocol has ended. No further response is expected. Continue when you are ready to return your attention to the room.",
      button: "Begin recovery.",
    },
    { text: "Recovery protocol beginning.", auto: 2600 },
    { text: "Breathe in slowly.", auto: 4200 },
    { text: "Hold for a moment.", auto: 2600 },
    { text: "Breathe out slowly.", auto: 5000 },
    { text: "Notice the surface supporting your body.", auto: 4500 },
    { text: "One. Beginning to return.", auto: 3600 },
    { text: "Two. Feeling returns to your hands and feet.", auto: 3600 },
    { text: "Three. Take a deeper breath.", auto: 3600 },
    { text: "Four. Notice the sounds in the room.", auto: 3600 },
    { text: "Five. Your thoughts are becoming clearer.", auto: 3600 },
    { text: "Six. Move your hands and feet.", auto: 3600 },
    { text: "Seven. Your attention belongs to you.", auto: 3600 },
    { text: "Eight. Your focus is steady.", auto: 3600 },
    { text: "Nine. One more full breath.", auto: 3600 },
    { text: "Ten. Clear, alert, and awake.", auto: 4600 },
    {
      text:
        "The session's suggestions end with the session. Stand, stretch, drink water, and take care of any bodily needs before returning to other tasks.",
      button: "I am awake and clear.",
      last: true,
    },
  ],
};
