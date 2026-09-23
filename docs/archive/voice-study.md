# Voice study (archived 2026-09-23)

> Retained for reference. The build is text-first with no speech; see the Voice section of [covert-priming-design.md](../covert-priming-design.md). Protocol names and praise lines quoted below predate the current arc.

I would not skip voice entirely, but I would remove it as a requirement. Current text-to-speech is good enough for a **synthetic programming-interface voice**; it is less reliably convincing as an intimate, seductive hypnotist.

The best approach is:

* design the complete game to work with text, music, pulses, binaural audio, and visual subliminals;
* add a sparse, prerecorded text-to-speech announcement layer;
* never generate speech live during play;
* treat whispered audio subliminals as optional production polish.

## Where text-to-speech will work well

Text-to-speech fits short, emotionally controlled machine announcements:

> Human verification complete.
> Programmable unit detected.
> Binaural carrier active.
> Center.
> Follow.
> Correct obedience.
> Program installed.
> Unit ready for use.

A slight artificial quality helps here. The speaker is an automated programming apparatus, so perfect human warmth is unnecessary and might even weaken the concept.

Modern commercial models can produce very natural speech—OpenAI currently provides 11 built-in voices, while ElevenLabs and Cartesia emphasize expressive, controllable delivery. ([ElevenLabs Documentation][4])

## Where it may fail

Text-to-speech becomes riskier when asked to carry:

* prolonged seductive narration;
* breathy intimate whispers;
* moaning or highly sexualized delivery;
* subtle transitions between clinical authority and erotic praise;
* long hypnosis passages requiring carefully controlled rhythm;
* lines whose entire appeal depends upon sincere human desire.

That is where synthetic delivery can feel embarrassing or generic. A weak reading of "Good robot" is substantially worse than displaying the words over a satisfying visual and audio reward.

So I would not write a spoken hypnosis script. I would use speech as punctuation.

## Revised audio architecture

### 1. Music and programming carrier

This remains essential:

* stereo or binaural-style tone;
* slow underlying pulse;
* spiral-synchronized modulation;
* increasing warmth and density;
* low-frequency programming texture.

No speech required.

### 2. Interface sounds

Also essential:

* selection click;
* correction tone;
* acceptance chime;
* reward bloom;
* program-installation sound;
* final completion sound.

The acceptance chime does much more conditioning work than spoken praise because it can remain perfectly consistent across the entire experience.

### 3. Sparse synthetic announcements

Optional but recommended.

Use perhaps 25–40 short clips across the entire game. Most should be under three seconds.

Good categories:

* phase changes;
* program names;
* one-word commands;
* confirmation;
* installation results;
* occasional praise.

Avoid having the voice read every line visible on the screen.

### 4. Audio subliminals

Optional and expendable.

The visual subliminal channel should carry the semantic content. If the audio layer works, add occasional synthetic fragments such as:

* "robot";
* "follow";
* "good";
* "obey";
* "horny";
* "blank";
* "useful."

They can be filtered, panned, layered, or partially masked. Because they are fragments, slightly uncanny text-to-speech is harmless. It may even sound more like machine data entering the audio stream.

If these fragments sound corny, remove them. The game loses very little because visual subliminals already perform the recognition-and-reveal structure.

## How much should be voiced

I would use this hierarchy:

| Material                           | Voice treatment                            |
| ---------------------------------- | ------------------------------------------ |
| Ordinary CAPTCHA prompts           | Text only                                  |
| Secondary and subliminal messages  | Visual by default                          |
| Technical programming claims       | Selected voice announcements               |
| Commands such as CENTER and FOLLOW | Voice after they have been taught visually |
| Routine praise                     | Occasional voice plus consistent chime     |
| Explicit erotic propositions       | Primarily text                             |
| Program installation               | Voice and text together                    |
| Final completed-state report       | Voice, text, and full audiovisual reward   |

This keeps voice special. When it begins after robot confirmation, it becomes another sign that programming mode has opened.

## Suggested spoken sequence

Before conversion, the game can be almost completely silent except for interface sounds. After conversion:

### Programming chamber opens

Spoken:

> Programmable unit detected.

Text continues:

> VISUAL OCCUPATION CHANNEL ACTIVE
> BINAURAL RECEPTIVITY CARRIER ACTIVE
> SUBLIMINAL CHANNEL ACTIVE

Spoken:

> Programming mode active.

### During RECEIVE

Mostly text and spiral effects.

Spoken at key points:

> Center.
> Hold.
> Receive.

Installation:

> Receptivity program installed.

### During OBEY

Commands alternate between visible and spoken presentation:

> Center.
> Follow.
> Hold.
> Accept.

Reward:

> Correct obedience.

Installation:

> Obey program installed.

### During APPROVAL

Most erotic development remains visual.

The chime appears after every correct response, but the voice says "Good robot" only occasionally. Scarcity makes it more effective.

### During AROUSAL

Let text do most of the explicit work:

> OBEDIENCE IS HOT
> PRAISE INCREASES NEED
> ROBOT WANTS MORE

The voice only marks the installation:

> Arousal program installed.

This avoids demanding that text-to-speech convincingly perform a long erotic monologue.

### Final program

A small number of spoken fragments return:

> Horny.
> Blank.
> Obedient.
> Useful.

Final announcement:

> Programming complete. Unit ready for use.

## Production method

Pre-render every clip and treat it as an ordinary audio asset.

Do not use browser speech synthesis. Browser voices vary by operating system, available voice packs, and device; the same game could sound acceptable on one laptop and ridiculous on another.

Do not call a cloud speech service during the session. Live generation would add:

* network dependency;
* latency;
* inconsistent output;
* possible vendor moderation failures;
* the risk that a model update changes the voice;
* difficulty synchronizing speech with visual programming beats.

Instead:

1. Finalize a provisional line list.
2. Render several versions of every line.
3. Select the best take manually.
4. Trim pauses.
5. Normalize volume.
6. Apply consistent processing.
7. Export compressed game-ready assets.
8. Trigger them like any other sound effect.

## Processing synthetic speech

A little post-processing can turn "AI narration" into a deliberate interface voice:

* light compression for consistent volume;
* equalization to remove excessive warmth or harshness;
* subtle distortion or vocoding;
* a quiet lower-pitched duplicate beneath important lines;
* short stereo delay during programming;
* longer reverb only for installation results;
* filtered, panned duplicates for subliminal fragments.

Keep the central announcement intelligible. Reserve heavy processing for peripheral fragments.

One useful progression:

| Phase                  | Voice treatment                             |
| ---------------------- | ------------------------------------------- |
| Robot detection        | Dry, clinical, centered                     |
| Programming activation | Slight stereo widening                      |
| Obedience              | Firm, compressed, close                     |
| Approval               | Warmer lower layer                          |
| Arousal                | Wider and more enveloping                   |
| Simplification         | Multiple faint delayed copies               |
| Final program          | Clean central voice surrounded by fragments |

The voice itself need not perform all the eroticism; the mix can become more intimate and invasive around it.

## Which model to try

I would audition these rather than committing immediately:

* **ElevenLabs:** probably the easiest route to polished, expressive output. Commercial rights require an eligible paid plan, and its current use policy should be checked against the finished adult script before depending on it. ([ElevenLabs Documentation][4])
* **OpenAI text-to-speech:** good built-in voices and style-controlled natural speech; worth trying for restrained clinical delivery. ([OpenAI API][5])
* **Kokoro:** open-weight, lightweight, and Apache-licensed, so it is attractive if you want to generate everything locally without submitting erotic copy to a service. Its mild artificiality may fit the interface voice especially well. ([github.com][6])

For this project I would test a polished cloud model against Kokoro. The question is not "Which sounds most human?" It is "Which sounds most like the authoritative machine running this game?"

## A small audition before committing

Render these five lines in three candidate voices:

> Human verification complete.
> Binaural carrier active.
> Good robot.
> Obedience produces pleasure.
> Unit ready for use.

Those cover:

* technical reporting;
* pseudoscientific authority;
* praise;
* erotic programming;
* objectifying completion.

Listen to each voice both dry and with the proposed processing. If none can say "Good robot" and "Obedience produces pleasure" without puncturing the mood, skip semantic voice entirely.

My recommendation is therefore: **text-first game, sparse pre-rendered synthetic machine voice, visual rather than auditory subliminals, and no live text-to-speech dependency.** That preserves almost everything valuable in the design while avoiding a large voice-production burden.

[4]: https://elevenlabs.io/docs/overview/capabilities/text-to-speech "Text to Speech"
[5]: https://developers.openai.com/api/docs/guides/text-to-speech "Text to speech"
[6]: https://github.com/hexgrad/kokoro "Kokoro"
