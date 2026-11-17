{
  description = "chrome-extension-open-link-in-same-tab-popup-as-tab dev-shell skill set: an isolated sub-flake invoked at runtime by the root devShell, never a root input, so the skill sources live only in this flake's lock.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";

    # The builder lib; it carries no skill inputs.
    agent-skill-flake = {
      url = "github:nhooey/agent-skill-flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # The one skill source: skillspkgs' combination for this repository's
    # family, browser extensions and game mods.
    skillspkgs-combinations = {
      url = "github:nhooey/skillspkgs?dir=sources/combinations";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      agent-skill-flake,
      ...
    }@inputs:
    agent-skill-flake.lib.mkDevshellSkillsFlake {
      inherit nixpkgs;
      systems = import inputs.systems;
      name = "chrome-extension-open-link-in-same-tab-popup-as-tab-devshell";
      sources = [
        # The browser-extensions-and-game-mods family's skills. The family is
        # all JavaScript, so this repository adds no skills of its own.
        { source = inputs.skillspkgs-combinations.combinations.browser-extensions-and-game-mods; }
      ];
    };
}
