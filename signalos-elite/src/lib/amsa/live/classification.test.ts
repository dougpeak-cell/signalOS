import {
  describe,
  expect,
  it,
} from "vitest";

import {
  sectorToEtf,
} from "./classification";

describe(
  "Sector ETF mapping",
  () => {
    it(
      "maps Technology to XLK",
      () => {
        expect(
          sectorToEtf(
            "Technology",
          ),
        ).toBe("XLK");
      },
    );

    it(
      "maps Energy to XLE",
      () => {
        expect(
          sectorToEtf(
            "Energy",
          ),
        ).toBe("XLE");
      },
    );

    it(
      "returns null for unknown sectors",
      () => {
        expect(
          sectorToEtf(
            "Unknown Sector",
          ),
        ).toBeNull();
      },
    );
  },
);