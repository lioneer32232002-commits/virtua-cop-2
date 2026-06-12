// Logical sound-effect name → extracted WVP clip file.
//
// ⚠️ PROVISIONAL mapping, guessed by clip DURATION only — nobody has listened
// yet (the preview window is silent). The original clip semantics are unknown.
// USER: audition any clip locally with
//     __game.audio.audition('sound11_03.wav')
// (files are sound{11,12,13,14}_NN.wav, see /assets/audio/manifest.json), then
// correct the file names below to match what each effect should actually sound
// like.
//
// These WAVs are original game assets: they live in /assets/audio/ which is
// gitignored and ABSENT from the public deploy. When a file is missing (404),
// AudioManager falls back to its synth placeholder — so the public build keeps
// the placeholder beeps and never ships original audio.
export const SE_FILES = {
  gunshot:   'sound11_03.wav',  // 0.17s — short & punchy (provisional)
  enemyHit:  'sound11_33.wav',  // 0.25s — brief impact (provisional)
  playerHit: 'sound11_00.wav',  // 0.48s (provisional)
  reload:    'sound11_26.wav',  // 0.40s — mechanical length (provisional)
  card:      'sound11_01.wav',  // 0.98s — voice length, e.g. "JUSTICE SHOT" (provisional)
}

export const AUDIO_BASE = '/assets/audio/'
