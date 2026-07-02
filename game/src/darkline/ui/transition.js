// 段落轉場（spec §5.5）：琥珀 wipe + 掃描線，蓋住段落拆建的縫（scene pop）。
// cover() 完成後才輪到呼叫端拆場景；reveal() 掃出。樣式在 index.html（.dl-transition）。
import { gsap } from 'gsap'

export function mountTransition(container) {
  container.classList.add('dl-transition')
  const bar = document.createElement('div')
  bar.className = 'wipe'
  container.append(bar)
  let covered = false
  return {
    get isCovered() { return covered },
    cover({ duration = 0.35 } = {}) {
      return new Promise(resolve => {
        container.classList.add('active')
        gsap.fromTo(bar, { xPercent: -100 }, {
          xPercent: 0, duration, ease: 'power2.inOut',
          onComplete: () => { covered = true; resolve() },
        })
      })
    },
    reveal({ duration = 0.45 } = {}) {
      return new Promise(resolve => {
        gsap.to(bar, {
          xPercent: 100, duration, ease: 'power2.inOut',
          onComplete: () => {
            covered = false
            container.classList.remove('active')
            gsap.set(bar, { xPercent: -100 })
            resolve()
          },
        })
      })
    },
  }
}
