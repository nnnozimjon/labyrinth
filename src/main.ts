import { Game } from "./app/Game";
import { disposeGltfLoaderContext } from "./utils/gltf-loader";

const game = new Game();
game.start();

window.addEventListener("beforeunload", () => {
  disposeGltfLoaderContext();
});
