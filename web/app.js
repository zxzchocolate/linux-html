(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const bootButton = byId("boot");
  const pauseButton = byId("pause");
  const resetButton = byId("reset");
  const screen = byId("screen");
  const serial = byId("serial");
  const status = byId("status");
  const statusDot = byId("status-dot");
  const buildStatus = byId("build-status");

  let machine = null;
  let running = false;
  let booting = false;

  const assets = {
    wasm: "vendor/v86/v86.wasm",
    bios: "runtime/bios/seabios.bin",
    vgaBios: "runtime/bios/vgabios.bin",
    kernel: "runtime/kernel/bzImage",
    initrd: "runtime/initrd/initramfs.cpio.gz"
  };

  function setStatus(message, active = false) {
    status.textContent = message;
    statusDot.classList.toggle("running", active);
  }

  function log(message) {
    serial.textContent += String(message);
    serial.scrollTop = serial.scrollHeight;
  }

  async function checkAssets() {
    const missing = [];
    for (const [name, url] of Object.entries(assets)) {
      try {
        const response = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (!response.ok) missing.push(name + " (" + url + ")");
      } catch {
        missing.push(name + " (" + url + ")");
      }
    }
    return missing;
  }

  async function boot() {
    if (booting || running) return;
    booting = true;
    bootButton.disabled = true;
    setStatus("Checking local boot assets");
    serial.textContent = "Linux HTML boot sequence\nChecking repository assets...\n";

    try {
      const missing = await checkAssets();
      if (missing.length) {
        log("\nCannot boot yet. Missing required files:\n- " + missing.join("\n- "));
        log("\nNext build step: add the v86 WebAssembly runtime, a compatible x86 Linux kernel, and an initramfs at the paths shown above.");
        setStatus("Boot assets missing");
        buildStatus.textContent = "The HTML/JS runtime controller is ready, but boot assets are missing: " + missing.join(", ") + ".";
        return;
      }

      if (typeof window.V86Starter !== "function") {
        throw new Error("vendor/v86/libv86.js did not expose V86Starter.");
      }

      screen.innerHTML = "";
      machine = new window.V86Starter({
        wasm_path: assets.wasm,
        memory_size: 256 * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        screen_container: screen,
        bios: { url: assets.bios },
        vga_bios: { url: assets.vgaBios },
        bzimage: { url: assets.kernel },
        initrd: { url: assets.initrd },
        cmdline: "console=ttyS0 console=tty0",
        autostart: false
      });

      machine.add_listener("serial0-output", (data) => log(data));
      machine.add_listener("emulator-ready", () => {
        machine.run();
        running = true;
        booting = false;
        pauseButton.disabled = false;
        resetButton.disabled = false;
        pauseButton.textContent = "Pause";
        setStatus("Linux is running", true);
        log("\n[emulator ready]\n");
      });
      machine.add_listener("download-progress", (data) => {
        if (data && Number.isFinite(data.loaded) && Number.isFinite(data.total) && data.total > 0) {
          setStatus("Loading runtime " + Math.floor(data.loaded / data.total * 100) + "%");
        }
      });
    } catch (error) {
      log("\nBoot error: " + (error && error.message ? error.message : String(error)) + "\n");
      setStatus("Boot failed");
      bootButton.disabled = false;
      booting = false;
    }
  }

  function togglePause() {
    if (!machine || !running) return;
    if (pauseButton.textContent === "Pause") {
      machine.stop();
      pauseButton.textContent = "Resume";
      setStatus("Paused");
    } else {
      machine.run();
      pauseButton.textContent = "Pause";
      setStatus("Linux is running", true);
    }
  }

  async function reset() {
    if (machine) {
      try { machine.stop(); } catch {}
      try { machine.destroy(); } catch {}
    }
    machine = null;
    running = false;
    booting = false;
    bootButton.disabled = false;
    pauseButton.disabled = true;
    resetButton.disabled = true;
    pauseButton.textContent = "Pause";
    screen.innerHTML = '<div class="screen-placeholder"><div class="prompt-mark">_</div><strong>Virtual machine stopped</strong><p>Boot Linux to start a new session.</p></div>';
    serial.textContent = "Linux HTML runtime\nMachine reset.\n";
    setStatus("Runtime not started");
  }

  bootButton.addEventListener("click", boot);
  pauseButton.addEventListener("click", togglePause);
  resetButton.addEventListener("click", reset);
  byId("clear").addEventListener("click", () => { serial.textContent = ""; });

  window.addEventListener("beforeunload", () => {
    if (machine) {
      try { machine.stop(); } catch {}
      try { machine.destroy(); } catch {}
    }
  });
})();