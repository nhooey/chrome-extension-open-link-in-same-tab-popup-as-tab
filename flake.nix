{
  description = "Chrome extension: open links in the same tab, and popups as tabs";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
    systems.url = "github:nix-systems/default";
    # The builder library, not a skill: it exports the
    # `flakeModules.devshellSkills` module for the dev shell. The dev shell's
    # skills live in the `skills-devshell/` sub-flake, invoked at runtime, so
    # this flake carries no skill inputs.
    agent-skill-flake = {
      url = "github:nhooey/agent-skill-flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { flake-parts, ... }@inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import inputs.systems;
      imports = [ inputs.agent-skill-flake.flakeModules.devshellSkills ];

      agent-skill-flake.devshellSkills = {
        name = "chrome-extension-open-link-in-same-tab-popup-as-tab";
        # No formatter is configured, so leave out the whole check / fmt /
        # update-flake trio, not only its `fmt`: the module adds just its
        # two skills commands. `extension check` runs nix flake check.
        includeStandardCommands = false;
      };

      perSystem =
        { pkgs, lib, ... }:
        {
          # The project's commands live in one tool, `tools/extension.js`,
          # run by the dev shell's Node.
          devshells.default = {
            packages = [ pkgs.nodejs ];
            commands = [
              {
                category = "dev";
                name = "extension";
                help = "Run the extension's tests or nix flake check (extension --help)";
                command = ''exec ${lib.getExe pkgs.nodejs} "$PRJ_ROOT/tools/extension.js" "$@"'';
              }
            ];
          };

          # The extension's tests, run by Node's built-in runner: no npm
          # packages, so nothing to fetch.
          checks.tests =
            pkgs.runCommand "tests"
              {
                nativeBuildInputs = [ pkgs.nodejs ];
                src = lib.fileset.toSource {
                  root = ./.;
                  fileset = lib.fileset.unions [
                    (lib.fileset.fileFilter (
                      file: lib.any file.hasExt [ "js" "json" "html" "png" ]
                    ) ./.)
                    ./test
                  ];
                };
              }
              ''
                cd "$src"
                node --test 'test/*.test.js'
                touch "$out"
              '';
        };
    };
}
