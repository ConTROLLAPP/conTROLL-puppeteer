
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
    pkgs.nodePackages.typescript-language-server
    pkgs.git
    pkgs.chromium
    pkgs.nss
    pkgs.freetype
    pkgs.freetype.dev
    pkgs.fontconfig
    pkgs.fontconfig.dev
    pkgs.libGL
    pkgs.mesa
    pkgs.glib
    pkgs.nss
    pkgs.nspr
    pkgs.atk
    pkgs.at-spi2-atk
    pkgs.libdrm
    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.xorg.libxshmfence
    pkgs.xorg.libXss
    pkgs.libxkbcommon
    pkgs.alsaLib
  ];

  env = {
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true";
    PUPPETEER_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
  };
}

