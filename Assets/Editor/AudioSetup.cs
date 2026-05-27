// Assets/Editor/AudioSetup.cs
// Synthesizes placeholder SFX/BGM as .wav files (mono 16-bit PCM 22050Hz).
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod AudioSetup.GeneratePlaceholderAudio -quit -logFile <log>
using System;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class AudioSetup
{
    private const int    SampleRate = 22050;
    private const string AudioRoot  = "Assets/Audio";
    private const string BgmDir     = AudioRoot + "/BGM";
    private const string SfxDir     = AudioRoot + "/SFX";

    public static void GeneratePlaceholderAudio()
    {
        Debug.Log("[AudioSetup] Generating placeholder audio...");
        EnsureFolder(AudioRoot);
        EnsureFolder(BgmDir);
        EnsureFolder(SfxDir);

        // SFX (short clips)
        WriteWav($"{SfxDir}/sfx_pistol.wav",        SynthGunshot(0.18f, 220f, 0.4f));
        WriteWav($"{SfxDir}/sfx_machinegun.wav",    SynthGunshot(0.09f, 380f, 0.35f));
        WriteWav($"{SfxDir}/sfx_shotgun.wav",       SynthGunshot(0.32f, 140f, 0.55f));
        WriteWav($"{SfxDir}/sfx_reload.wav",        SynthClickClick());
        WriteWav($"{SfxDir}/sfx_enemy_death.wav",   SynthDescendingTone(0.32f, 220f, 60f));
        WriteWav($"{SfxDir}/sfx_player_hit.wav",    SynthBuzz(0.22f, 110f));
        WriteWav($"{SfxDir}/sfx_innocent_hit.wav",  SynthBeep(0.25f, 880f));

        // BGM (4 second loopable simple chord progressions)
        WriteWav($"{BgmDir}/bgm_stage1.wav", SynthLoop(4.0f, new[] { 220f, 261.63f, 329.63f }));
        WriteWav($"{BgmDir}/bgm_stage2.wav", SynthLoop(4.0f, new[] { 196f, 246.94f, 311.13f }));
        WriteWav($"{BgmDir}/bgm_stage3.wav", SynthLoop(4.0f, new[] { 174.61f, 220f, 277.18f }));
        WriteWav($"{BgmDir}/bgm_boss.wav",   SynthLoop(4.0f, new[] { 146.83f, 207.65f, 246.94f }));

        AssetDatabase.Refresh();
        Debug.Log("[AudioSetup] Done.");
    }

    // -------------------------------------------------------------------
    // Synthesizers
    // -------------------------------------------------------------------

    private static float[] SynthGunshot(float duration, float baseFreq, float noiseAmount)
    {
        int n = Mathf.RoundToInt(duration * SampleRate);
        var samples = new float[n];
        var rand = new System.Random(0);
        for (int i = 0; i < n; i++)
        {
            float t = (float)i / SampleRate;
            float env = Mathf.Exp(-12f * t);
            float tone = Mathf.Sin(2f * Mathf.PI * baseFreq * t) * 0.5f;
            float noise = (float)(rand.NextDouble() * 2.0 - 1.0) * noiseAmount;
            samples[i] = (tone + noise) * env * 0.7f;
        }
        return samples;
    }

    private static float[] SynthClickClick()
    {
        // Two short clicks separated by ~100ms
        float duration = 0.30f;
        int n = Mathf.RoundToInt(duration * SampleRate);
        var samples = new float[n];
        var rand = new System.Random(1);
        for (int i = 0; i < n; i++)
        {
            float t = (float)i / SampleRate;
            float env1 = (t < 0.02f) ? Mathf.Exp(-200f * t) : 0f;
            float env2 = (t > 0.12f && t < 0.16f) ? Mathf.Exp(-200f * (t - 0.12f)) : 0f;
            float noise = (float)(rand.NextDouble() * 2.0 - 1.0);
            samples[i] = noise * (env1 + env2) * 0.6f;
        }
        return samples;
    }

    private static float[] SynthDescendingTone(float duration, float startFreq, float endFreq)
    {
        int n = Mathf.RoundToInt(duration * SampleRate);
        var samples = new float[n];
        float phase = 0f;
        for (int i = 0; i < n; i++)
        {
            float t = (float)i / SampleRate;
            float u = t / duration;
            float freq = Mathf.Lerp(startFreq, endFreq, u);
            phase += 2f * Mathf.PI * freq / SampleRate;
            float env = Mathf.Exp(-4f * t);
            samples[i] = Mathf.Sin(phase) * env * 0.6f;
        }
        return samples;
    }

    private static float[] SynthBuzz(float duration, float freq)
    {
        int n = Mathf.RoundToInt(duration * SampleRate);
        var samples = new float[n];
        for (int i = 0; i < n; i++)
        {
            float t = (float)i / SampleRate;
            float env = Mathf.Exp(-6f * t);
            // Square-wave-ish via tanh of sine
            float v = (float)Math.Tanh(Mathf.Sin(2f * Mathf.PI * freq * t) * 5.0);
            samples[i] = v * env * 0.5f;
        }
        return samples;
    }

    private static float[] SynthBeep(float duration, float freq)
    {
        int n = Mathf.RoundToInt(duration * SampleRate);
        var samples = new float[n];
        for (int i = 0; i < n; i++)
        {
            float t = (float)i / SampleRate;
            float fadeIn  = Mathf.Clamp01(t / 0.01f);
            float fadeOut = Mathf.Clamp01((duration - t) / 0.01f);
            float env = fadeIn * fadeOut;
            samples[i] = Mathf.Sin(2f * Mathf.PI * freq * t) * env * 0.55f;
        }
        return samples;
    }

    private static float[] SynthLoop(float duration, float[] chordFreqs)
    {
        int n = Mathf.RoundToInt(duration * SampleRate);
        var samples = new float[n];
        // Three tones across the duration, one per chordFreqs entry
        int seg = n / chordFreqs.Length;
        for (int s = 0; s < chordFreqs.Length; s++)
        {
            float freq = chordFreqs[s];
            int start = s * seg;
            int end   = Mathf.Min(start + seg, n);
            for (int i = start; i < end; i++)
            {
                float t = (float)(i - start) / SampleRate;
                float segLen = (float)(end - start) / SampleRate;
                float fadeIn  = Mathf.Clamp01(t / 0.05f);
                float fadeOut = Mathf.Clamp01((segLen - t) / 0.05f);
                float env = fadeIn * fadeOut;
                samples[i] = (
                      Mathf.Sin(2f * Mathf.PI * freq        * t) * 0.35f
                    + Mathf.Sin(2f * Mathf.PI * freq * 2f   * t) * 0.10f
                ) * env;
            }
        }
        return samples;
    }

    // -------------------------------------------------------------------
    // WAV writer (PCM 16-bit mono)
    // -------------------------------------------------------------------

    private static void WriteWav(string path, float[] samples)
    {
        var bytes = ToWav(samples, SampleRate);
        File.WriteAllBytes(path, bytes);
        AssetDatabase.ImportAsset(path);
        // Set import settings: load type, force mono, etc. (defaults work fine for short clips)
        var importer = AssetImporter.GetAtPath(path) as AudioImporter;
        if (importer != null)
        {
            importer.forceToMono = true;
            var settings = importer.defaultSampleSettings;
            settings.loadType = AudioClipLoadType.DecompressOnLoad;
            settings.compressionFormat = AudioCompressionFormat.Vorbis;
            settings.quality = 0.5f;
            importer.defaultSampleSettings = settings;
            importer.SaveAndReimport();
        }
        Debug.Log($"[AudioSetup] {path} ({samples.Length} samples)");
    }

    private static byte[] ToWav(float[] samples, int sampleRate)
    {
        int byteCount = samples.Length * 2; // 16-bit PCM
        using var ms = new MemoryStream(44 + byteCount);
        using var bw = new BinaryWriter(ms);

        // RIFF header
        bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
        bw.Write(36 + byteCount);
        bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));

        // fmt chunk
        bw.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
        bw.Write(16);          // chunk size
        bw.Write((short)1);    // PCM format
        bw.Write((short)1);    // mono
        bw.Write(sampleRate);
        bw.Write(sampleRate * 2); // byte rate
        bw.Write((short)2);    // block align
        bw.Write((short)16);   // bits per sample

        // data chunk
        bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
        bw.Write(byteCount);
        foreach (var s in samples)
        {
            short v = (short)Mathf.Clamp(Mathf.RoundToInt(s * 32767f), -32768, 32767);
            bw.Write(v);
        }

        return ms.ToArray();
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;
        var parent = System.IO.Path.GetDirectoryName(path).Replace('\\', '/');
        var name   = System.IO.Path.GetFileName(path);
        if (!AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, name);
    }
}
