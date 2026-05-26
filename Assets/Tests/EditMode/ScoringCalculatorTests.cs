using NUnit.Framework;
using VirtuaCop2;

namespace VirtuaCop2.Tests
{
    public class ScoringCalculatorTests
    {
        [Test]
        public void BodyKill_Returns100()
        {
            int score = ScoringCalculator.CalculateKillScore(KillType.Body, 5f);
            Assert.AreEqual(100, score);
        }

        [Test]
        public void HeadShot_Returns300()
        {
            int score = ScoringCalculator.CalculateKillScore(KillType.HeadShot, 5f);
            Assert.AreEqual(300, score);
        }

        [Test]
        public void Disarm_Returns500()
        {
            int score = ScoringCalculator.CalculateKillScore(KillType.Disarm, 5f);
            Assert.AreEqual(500, score);
        }

        [Test]
        public void SpeedBonus_Within1s_DoublesScore()
        {
            int score = ScoringCalculator.CalculateKillScore(KillType.Body, 0.5f);
            Assert.AreEqual(200, score);
        }

        [Test]
        public void SpeedBonus_Exactly1s_DoublesScore()
        {
            int score = ScoringCalculator.CalculateKillScore(KillType.Body, 1f);
            Assert.AreEqual(200, score);
        }

        [Test]
        public void SpeedBonus_After1s_NoBonus()
        {
            int score = ScoringCalculator.CalculateKillScore(KillType.Body, 1.1f);
            Assert.AreEqual(100, score);
        }

        [Test]
        public void StageClearBonus_FullHealth_MaxTime()
        {
            int bonus = ScoringCalculator.CalculateStageClearBonus(5, 180f);
            Assert.AreEqual(5000 + 1800, bonus);
        }

        [Test]
        public void StageClearBonus_ZeroHealth_ZeroTime()
        {
            int bonus = ScoringCalculator.CalculateStageClearBonus(0, 0f);
            Assert.AreEqual(0, bonus);
        }

        [Test]
        public void ComboBonus_Every5Kills_Adds1000()
        {
            Assert.AreEqual(1000, ScoringCalculator.CalculateComboBonus(5));
            Assert.AreEqual(1000, ScoringCalculator.CalculateComboBonus(10));
        }

        [Test]
        public void ComboBonus_NonMultipleOf5_Returns0()
        {
            Assert.AreEqual(0, ScoringCalculator.CalculateComboBonus(3));
            Assert.AreEqual(0, ScoringCalculator.CalculateComboBonus(7));
        }
    }
}
