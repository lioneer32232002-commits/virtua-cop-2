// Assets/Editor/Stage4AudioSetup.cs
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod Stage4AudioSetup.GenerateAll -quit -logFile <log>
using System;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class Stage4AudioSetup
{
    private const int SampleRate = 22050;
    private const string BgmDir = "Assets/Audio/BGM";
    private const string SfxDir = "Assets/Audio/SFX";

    public static void GenerateAll()
    {
        EnsureFolder(BgmDir);
        EnsureFolder(SfxDir);

        WriteWav($"{BgmDir}/bgm_stage4.wav",      8.0f, t => Mathf.Sin(2f * Mathf.PI * 110f * t) * 0.18f * (0.5f + 0.5f * Mathf.Sin(2f * Mathf.PI * 2f * t)));
        WriteWav($"{BgmDir}/bgm_boss_final.wav",  8.0f, t => (Mathf.Sin(2f * Mathf.PI * 220f * t) + Mathf.Sin(2f * Mathf.PI * 330f * t)) * 0.18f);
        WriteWav($"{SfxDir}/sfx_wood_break.wav",  0.3f, t => UnityEngine.Random.Range(-0.5f, 0.5f) * Mathf.Exp(-t * 8f));
        WriteWav($"{SfxDir}/sfx_chandelier_crash.wav", 0.6f, t => UnityEngine.Random.Range(-1f, 1f) * Mathf.Exp(-t * 4f));
        WriteWav($"{SfxDir}/sfx_debris_fall.wav", 0.7f, t => Mathf.Sin(2f * Mathf.PI * 60f * t) * Mathf.Exp(-t * 1.5f) + UnityEngine.Random.Range(-0.2f, 0.2f) * Mathf.Exp(-Mathf.Pow(t - 0.5f, 2) * 20f));
        WriteWav($"{SfxDir}/sfx_vip_thanks.wav",  0.4f, t => Mathf.Sin(2f * Mathf.PI * 660f * t) * (1f - t / 0.4f));

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[Stage4AudioSetup] All stage-4 audio placeholders written.");
    }

    private static void WriteWav(string path, float seconds, Func<float, float> sampler)
    {
        int totalSamples = Mathf.RoundToInt(seconds * SampleRate);
        var pcm = new short[totalSamples];
        for (int i = 0; i < totalSamples; i++)
        {
            float t   = (float)i / SampleRate;
            float val = Mathf.Clamp(sampler(t), -1f, 1f);
            pcm[i] = (short)Mathf.RoundToInt(val * short.MaxValue * 0.6f);
        }

        using (var ms = new MemoryStream())
        using (var bw = new BinaryWriter(ms))
        {
            bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(36 + pcm.Length * 2);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt "));
            bw.Write(16);
            bw.Write((short)1);
            bw.Write((short)1);
            bw.Write(SampleRate);
            bw.Write(SampleRate * 2);
            bw.Write((short)2);
            bw.Write((short)16);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            bw.Write(pcm.Length * 2);
            foreach (var s in pcm) bw.Write(s);
            File.WriteAllBytes(path, ms.ToArray());
        }
        Debug.Log($"[Stage4AudioSetup] {path}");
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;
        var parent = Path.GetDirectoryName(path).Replace('\\', '/');
        var name   = Path.GetFileName(path);
        if (!AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, name);
    }
}
