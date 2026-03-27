// ─── CONFIG ───────────────────────────────────────────────────────────────────

const PAGES = [
  {
    name: "page1",
    frames: ["f1", "f2", "f3"],
    layers: ["0", "1", "2"],
    width: 1,
    height: 1,
  },
  {
    name: "page2",
    frames: ["f1", "f2", "f3"],
    layers: ["0", "1", "2"],
    width: 1,
    height: 1,
  },
  {
    name: "page3",
    frames: ["f1", "f2", "f3"],
    layers: ["0", "1", "2"],
    width: 1,
    height: 1,
  },
  // add more pages here — order must match order images were uploaded to compiler
]

const CONFIG = {
  fps: 3,
  loop: true,
  layerOffset: 0.3,   // meters between layers, stacking above tracked image
}

// ─── STATE ────────────────────────────────────────────────────────────────────

const state = {
  activePage: null,
  currentFrame: 0,
  animInterval: null,
  planeEntities: [],
}

// ─── ANIMATION ────────────────────────────────────────────────────────────────

function getPngPath(pageName, frame, layer) {
  return `./${pageName}/${frame}/${layer}.png`
}

function clearPlanes() {
  state.planeEntities.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  state.planeEntities = []
}

function stopAnimation() {
  clearInterval(state.animInterval)
  state.animInterval = null
}

function getAnchor(pageIndex) {
  return document.querySelector(`#anchor-${pageIndex}`)
}

function showFrame(pageIndex, frameIndex) {
  const page  = PAGES[pageIndex]
  const frame = page.frames[frameIndex]
  const anchor = getAnchor(pageIndex)
  if (!anchor) return

  clearPlanes()

  page.layers.forEach((layer, i) => {
    const path  = getPngPath(page.name, frame, layer)
    const plane = document.createElement("a-plane")
    plane.setAttribute("src", path)
    plane.setAttribute("width", page.width)
    plane.setAttribute("height", page.height)
    plane.setAttribute("position", `0 0 ${i * CONFIG.layerOffset}`)
    plane.setAttribute("rotation", "0 0 90")
    plane.setAttribute("material", "transparent: true; side: double; shader: flat")
    anchor.appendChild(plane)
    state.planeEntities.push(plane)
  })
}

function startAnimation(pageIndex) {
  state.currentFrame = 0
  stopAnimation()
  showFrame(pageIndex, 0)

  const page     = PAGES[pageIndex]
  const interval = 1000 / CONFIG.fps

  state.animInterval = setInterval(() => {
    state.currentFrame++
    if (state.currentFrame >= page.frames.length) {
      if (CONFIG.loop) {
        state.currentFrame = 0
      } else {
        stopAnimation()
        return
      }
    }
    showFrame(pageIndex, state.currentFrame)
  }, interval)

  document.getElementById("scan-btn").style.display = "block"
}

function stopAllAnimations() {
  stopAnimation()
  clearPlanes()
  state.activePage = null
  document.getElementById("scan-btn").style.display = "none"
}

// ─── SETUP ────────────────────────────────────────────────────────────────────

function buildAnchors() {
  const root = document.querySelector("#ar-root")

  PAGES.forEach((page, i) => {
    const anchor = document.createElement("a-entity")
    anchor.setAttribute("id", `anchor-${i}`)
    anchor.setAttribute("mindar-image-target", `targetIndex: ${i}`)
    root.appendChild(anchor)

    anchor.addEventListener("targetFound", () => {
      console.log(`target found: ${page.name}`)

      // if another page is animating, stop it
      if (state.activePage !== null && state.activePage !== i) {
        stopAllAnimations()
      }

      state.activePage = i
      startAnimation(i)
    })

    anchor.addEventListener("targetLost", () => {
  console.log(`target lost: ${page.name}`)
  if (state.activePage === i) {
    // only stop if we've completed at least one full loop
    if (state.currentFrame < PAGES[i].frames.length - 1) {
      // mid-animation — let it finish current loop before stopping
      state.waitingToStop = true
    } else {
      stopAllAnimations()
    }
  }
})
  })
}

// ─── SCAN BUTTON ──────────────────────────────────────────────────────────────

document.getElementById("scan-btn").addEventListener("click", () => {
  console.log("scan button tapped — stopping animation")
  stopAllAnimations()
})

// ─── INIT ─────────────────────────────────────────────────────────────────────

const scene = document.querySelector("#ar-scene")

scene.addEventListener("loaded", () => {
  buildAnchors()
  scene.systems["mindar-image-system"].start()
})