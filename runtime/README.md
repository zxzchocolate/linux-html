# Browser VM runtime assets

The browser front end is deliberately separate from the Linux kernel source tree.

The boot controller currently expects these local files:

- `vendor/v86/libv86.js` — v86 JavaScript runtime
- `vendor/v86/v86.wasm` — v86 WebAssembly module
- `runtime/bios/seabios.bin` — PC BIOS image
- `runtime/bios/vgabios.bin` — VGA BIOS image
- `runtime/kernel/bzImage` — compiled kernel compatible with the selected emulator
- `runtime/initrd/initramfs.cpio.gz` — bootable initramfs with an `/init` program

These assets are not included yet. The UI checks for them and reports exactly what is missing instead of showing a fake boot screen.

## Kernel compatibility

This repository is a fork of the Linux kernel source, not a precompiled boot image. The kernel must be configured and compiled for the virtual machine's CPU and devices. v86 targets a PC-compatible x86 machine; choose a kernel configuration supported by that emulator. The current upstream kernel source cannot simply be loaded as a `bzImage` without building it first.

## Networking

Browser networking requires a virtual network device plus a compatible backend/relay. GitHub Pages is static hosting and cannot run a custom relay server itself. A browser VM cannot directly control the host computer's Wi-Fi hardware.

## Licensing

Keep the Linux kernel's GPL-2.0 license notices intact. Before adding emulator code, BIOS binaries, kernel images, or a root filesystem, record each component's source and license in the repository.
