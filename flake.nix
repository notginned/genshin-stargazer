{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }: 
    flake-utils.lib.eachDefaultSystem
      (system: 
        let 
          name = "genshin-stargazer";
          src = ./.;
          pkgs = nixpkgs.legacyPackages.${system};
          nativeBuildInputs = [];
          buildInputs = [ pkgs.nodejs_24 ];
        in
        {
          devShells.default = pkgs.mkShell {
            inherit buildInputs;
          };
        }
      );
}

