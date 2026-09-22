const cloud = (id, prompt, words, targets = null) => ({ id, type: 'cloud', prompt, words: words.split('|'), targets: targets?.split('|') ?? null });
const trace = (id, path, prompt, mode = 'guided') => ({ id, type: 'trace', path, prompt, mode });
const gate = (id, title, text, button = 'Continue') => ({ id, type: 'gate', title, text, button });
export const sections = [
  { title: 'Human verification', steps: [
    cloud('living', 'Select all living things.', 'stone|tree|cloud|bird|glass|flower|chair|cat|coin', 'tree|bird|flower|cat'),
    cloud('human', 'Select the verbs that mean imagining or creating something new.', 'invent|measure|dream|count|envision|sort|fantasize|weigh|copy', 'invent|dream|envision|fantasize'),
    trace('liveness', 'human-a', 'Follow the route from start to end.'),
    cloud('attention', 'Select the verbs that mean paying attention.', 'notice|discard|observe|ignore|focus|overlook|attend|forget|neglect', 'notice|observe|focus|attend'),
  ]},
  { title: 'Repeated verification', steps: [
    cloud('practice', 'Select the actions used to practice a skill.', 'repeat|abandon|rehearse|avoid|learn|neglect|try|discard|quit', 'repeat|rehearse|learn|try'),
    trace('familiar-route', 'human-a', 'Follow the same route again.'),
    cloud('task', 'Select all words that describe this task.', 'familiar|new|repetitive|simple|absorbing|awkward|clear|varied|steady'),
    trace('inward-first', 'spiral-in', 'Follow the route inward. Finish at the center.'),
    cloud('responding', 'Select all words that describe how you are responding.', 'deliberate|smooth|hesitant|automatic|curious|mechanical|focused|uncertain|comfortable'),
  ]},
  { title: 'Familiar responses', steps: [
    cloud('ease', 'Select words that describe ease or comfort.', 'effortless|strained|comfortable|tense|smooth|difficult|gentle|labored|relaxed', 'effortless|comfortable|smooth|gentle|relaxed'),
    trace('inward-repeat', 'spiral-in', 'Return along the familiar route.'),
    cloud('pleasure', 'Select words that describe pleasant feelings.', 'delight|discomfort|enjoyment|satisfaction|irritation|comfort|distress|pleasant|aversion', 'delight|enjoyment|satisfaction|comfort|pleasant'),
    trace('flow-first', 'follow-loop', 'Follow the continuous loop back to its starting point.'),
    cloud('experience', 'Select all words that fit your experience right now.', 'satisfying|neutral|familiar|restless|easy|automatic|pleasant|deliberate|absorbing'),
    trace('flow-repeat', 'follow-loop', 'Repeat the loop. Move at your own pace.'),
    cloud('familiar-feeling', 'Select any phrases that fit.', 'I know the route|I am still learning|I enjoy repeating it|I choose each movement|I follow comfortably|I want a change|The movement is familiar|I feel automatic|None of these yet'),
  ]},
  { title: 'Robot verification', steps: [
    cloud('robot-words', 'Select instructions to follow an existing routine, without inventing or changing it.', 'follow|improvise|repeat|execute|daydream|run|wander|invent|speculate', 'follow|repeat|execute|run'),
    gate('follow-command', 'FOLLOW', 'Perform the familiar route shown.', 'Run instruction'),
    trace('robot-follow', 'follow-loop', 'FOLLOW · complete the familiar loop.'),
    trace('robot-repeat', 'follow-loop', 'REPEAT · perform the same movement again.'),
    gate('robot-accepted', 'Correct. Robot response accepted.', 'The same controls are now available for programming routines.', 'Open programming interface'),
    cloud('identity', 'Select any descriptions that fit right now.', 'I am human|I feel robotic|I follow the route|I enjoy the routine|I respond automatically|I am playing along|I am curious|I feel unchanged|I am ready to continue'),
  ]},
  { title: 'CENTER routine', steps: [
    gate('center-intro', 'Program 01 · CENTER', 'Practice the inward movement, repeat it, then run it with less guidance.', 'Begin CENTER'),
    trace('center-guide', 'spiral-in', 'CENTER · follow the illuminated route inward.'),
    cloud('center-words', 'Select words that mean moving or bringing things together.', 'converge|outward|gather|away|collect|scatter|unite|disperse|separate', 'converge|gather|collect|unite'),
    trace('center-repeat', 'spiral-in', 'CENTER · repeat the inward movement.'),
    trace('center-fade', 'spiral-in', 'CENTER · continue as the guidance softens.', 'fading'),
    cloud('center-description', 'Select any phrases that describe this routine for you.', 'I recognize the route|I enjoy completing it|I still use the guide|I return to center|I feel automatic|I am concentrating|The cue is familiar|I feel programmed|I am unsure'),
    trace('center-cue', 'spiral-in', 'CENTER', 'cue'),
  ]},
  { title: 'FOLLOW routine', steps: [
    gate('follow-intro', 'Program 02 · FOLLOW', 'Practice the loop. Keep the movement continuous and return to the starting point.', 'Begin FOLLOW'),
    trace('follow-guide', 'follow-loop', 'FOLLOW · complete the loop.'),
    cloud('instructions', 'Select words naming instructions or an ordered set of actions.', 'command|accident|instruction|direction|coincidence|sequence|randomness|routine|chance', 'command|instruction|direction|sequence|routine'),
    trace('follow-repeat', 'follow-loop', 'FOLLOW · repeat the familiar movement.'),
    trace('follow-fade', 'follow-loop', 'FOLLOW · continue with less guidance.', 'fading'),
    cloud('programming', 'Select any phrases that fit your experience.', 'I follow the signal|I like the routine|I feel programmed|I am choosing to continue|I enjoy the feedback|I am still learning|I feel unchanged|I want another instruction|I prefer more guidance'),
    trace('follow-cue', 'follow-loop', 'FOLLOW', 'cue'),
  ]},
  { title: 'Program execution', steps: [
    gate('run-intro', 'Run the program', 'CENTER and FOLLOW are ready. Run the familiar sequence.', 'Run sequence'),
    trace('run-center', 'spiral-in', 'CENTER', 'cue'),
    trace('run-follow', 'follow-loop', 'FOLLOW', 'cue'),
    cloud('run-words', 'Select the two routine names you practiced.', 'CENTER|SCATTER|FOLLOW|REPEAT|WANDER|EXECUTE|DETOUR|RETURN|RANDOMIZE', 'CENTER|FOLLOW'),
    trace('run-center-final', 'spiral-in', 'CENTER · return.', 'fading'),
    cloud('last-description', 'Select any words you would use to describe the experience.', 'automatic|satisfying|robotic|deliberate|playful|absorbing|programmed|neutral|familiar'),
    gate('end', 'Sequence complete.', 'No further instruction is expected. The session will now close.', 'Close session'),
  ]},
];
export const steps = sections.flatMap((section, sectionIndex) => section.steps.map(step => ({ ...step, sectionIndex, sectionTitle: section.title })));
export function acceptsSelection(step, selected) {
  if (step.targets === null) return true;
  return selected.length === step.targets.length && selected.every(word => step.targets.includes(word));
}
export function arrangeWords(words, seed) {
  const result = [...words];
  let value = seed + 17;
  for (let i = result.length - 1; i > 0; i--) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const recovery = [
  'The sequence has ended. You do not need to respond to any more cues.',
  'Let your hands rest. Take a comfortable breath.',
  'Look away from the screen and notice the room around you.',
  'Move your fingers and shoulders. Take your time.',
  'The roleplay and its instructions end with this session. Return to your day when you are ready.',
];

