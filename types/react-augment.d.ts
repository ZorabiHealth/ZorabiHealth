import "react";

declare module "react" {
  interface ReactSVG {
    [key: string]: unknown;
  }
}
