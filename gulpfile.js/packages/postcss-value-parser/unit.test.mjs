import { describe, it } from 'node:test';
import { deepEqual } from 'node:assert';
import unit from "./unit.mjs";

describe("Unit", () => {
  it("should parse '.23rem' with number '.23' and unit 'rem'", () => {
    deepEqual(unit(".23rem"), { number: ".23", unit: "rem" });
  });

  it("should parse '.2.3rem' with number '.2' and unit '.3rem'", () => {
    deepEqual(unit(".2.3rem"), { number: ".2", unit: ".3rem" });
  });

  it("should parse '2.' with number '2' and unit '.'", () => {
    deepEqual(unit("2."), { number: "2", unit: "." });
  });

  it("should parse '+2.' with number '+2' and unit '.'", () => {
    deepEqual(unit("+2."), { number: "+2", unit: "." });
  });

  it("should parse '-2.' with number '-2' and unit '.'", () => {
    deepEqual(unit("-2."), { number: "-2", unit: "." });
  });

  it("should return false for '+-2.'", () => {
    deepEqual(unit("+-2."), false);
  });

  it("should return false for '.'", () => {
    deepEqual(unit("."), false);
  });

  it("should return false for '.rem'", () => {
    deepEqual(unit(".rem"), false);
  });

  it("should parse '1e4px' with number '1e4' and unit 'px'", () => {
    deepEqual(unit("1e4px"), { number: "1e4", unit: "px" });
  });

  it("should parse '1em' with number '1' and unit 'em'", () => {
    deepEqual(unit("1em"), { number: "1", unit: "em" });
  });

  it("should parse '1e10' with empty unit", () => {
    deepEqual(unit("1e10"), { number: "1e10", unit: "" });
  });

  it("should return false for empty string", () => {
    deepEqual(unit(""), false);
  });

  it("should return false for 'e'", () => {
    deepEqual(unit("e"), false);
  });

  it("should return false for 'e1'", () => {
    deepEqual(unit("e1"), false);
  });

  it("should parse '2rem' with number '2' and unit 'rem'", () => {
    deepEqual(unit("2rem"), { number: "2", unit: "rem" });
  });

  it("should parse '2.000rem' with number '2.000' and unit 'rem'", () => {
    deepEqual(unit("2.000rem"), { number: "2.000", unit: "rem" });
  });

  it("should parse '+2rem' with number '+2' and unit 'rem'", () => {
    deepEqual(unit("+2rem"), { number: "+2", unit: "rem" });
  });

  it("should parse '-2rem' with number '-2' and unit 'rem'", () => {
    deepEqual(unit("-2rem"), { number: "-2", unit: "rem" });
  });

  it("should parse '1.1rem' with number '1.1' and unit 'rem'", () => {
    deepEqual(unit("1.1rem"), { number: "1.1", unit: "rem" });
  });

  it("should parse '+1.1rem' with number '+1.1' and unit 'rem'", () => {
    deepEqual(unit("+1.1rem"), { number: "+1.1", unit: "rem" });
  });

  it("should parse '-1.1rem' with number '-1.1' and unit 'rem'", () => {
    deepEqual(unit("-1.1rem"), { number: "-1.1", unit: "rem" });
  });

  it("should parse '1.1e1rem' with number '1.1e1' and unit 'rem'", () => {
    deepEqual(unit("1.1e1rem"), { number: "1.1e1", unit: "rem" });
  });

  it("should parse '+1.1e1rem' with number '+1.1e1' and unit 'rem'", () => {
    deepEqual(unit("+1.1e1rem"), { number: "+1.1e1", unit: "rem" });
  });

  it("should parse '-1.1e1rem' with number '-1.1e1' and unit 'rem'", () => {
    deepEqual(unit("-1.1e1rem"), { number: "-1.1e1", unit: "rem" });
  });

  it("should parse '1.1e+1rem' with number '1.1e+1' and unit 'rem'", () => {
    deepEqual(unit("1.1e+1rem"), { number: "1.1e+1", unit: "rem" });
  });

  it("should parse '1.1e-1rem' with number '1.1e-1' and unit 'rem'", () => {
    deepEqual(unit("1.1e-1rem"), { number: "1.1e-1", unit: "rem" });
  });

  it("should parse '1.1e1e1rem' with number '1.1e1' and unit 'e1rem'", () => {
    deepEqual(unit("1.1e1e1rem"), { number: "1.1e1", unit: "e1rem" });
  });

  it("should parse '1.1e-1e' with number '1.1e-1' and unit 'e'", () => {
    deepEqual(unit("1.1e-1e"), { number: "1.1e-1", unit: "e" });
  });

  it("should parse '1.1e--++1e' with number '1.1' and unit 'e--++1e'", () => {
    deepEqual(unit("1.1e--++1e"), { number: "1.1", unit: "e--++1e" });
  });

  it("should parse '1.1e--++1rem' with number '1.1' and unit 'e--++1rem'", () => {
    deepEqual(unit("1.1e--++1rem"), { number: "1.1", unit: "e--++1rem" });
  });

  it("should parse '100+px' with number '100' and unit '+px'", () => {
    deepEqual(unit("100+px"), { number: "100", unit: "+px" });
  });

  it("should parse '100.0.0px' with number '100.0' and unit '.0px'", () => {
    deepEqual(unit("100.0.0px"), { number: "100.0", unit: ".0px" });
  });

  it("should parse '100e1epx' with number '100e1' and unit 'epx'", () => {
    deepEqual(unit("100e1epx"), { number: "100e1", unit: "epx" });
  });

  it("should parse '100e1e1px' with number '100e1' and unit 'e1px'", () => {
    deepEqual(unit("100e1e1px"), { number: "100e1", unit: "e1px" });
  });

  it("should parse '+100.1e+1e+1px' with number '+100.1e+1' and unit 'e+1px'", () => {
    deepEqual(unit("+100.1e+1e+1px"), { number: "+100.1e+1", unit: "e+1px" });
  });

  it("should parse '-100.1e-1e-1px' with number '-100.1e-1' and unit 'e-1px'", () => {
    deepEqual(unit("-100.1e-1e-1px"), { number: "-100.1e-1", unit: "e-1px" });
  });

  it("should parse '.5px' with number '.5' and unit 'px'", () => {
    deepEqual(unit(".5px"), { number: ".5", unit: "px" });
  });

  it("should parse '+.5px' with number '+.5' and unit 'px'", () => {
    deepEqual(unit("+.5px"), { number: "+.5", unit: "px" });
  });

  it("should parse '-.5px' with number '-.5' and unit 'px'", () => {
    deepEqual(unit("-.5px"), { number: "-.5", unit: "px" });
  });

  it("should parse '.5e1px' with number '.5e1' and unit 'px'", () => {
    deepEqual(unit(".5e1px"), { number: ".5e1", unit: "px" });
  });

  it("should parse '-.5e1px' with number '-.5e1' and unit 'px'", () => {
    deepEqual(unit("-.5e1px"), { number: "-.5e1", unit: "px" });
  });

  it("should parse '+.5e1px' with number '+.5e1' and unit 'px'", () => {
    deepEqual(unit("+.5e1px"), { number: "+.5e1", unit: "px" });
  });

  it("should parse '.5e1e1px' with number '.5e1' and unit 'e1px'", () => {
    deepEqual(unit(".5e1e1px"), { number: ".5e1", unit: "e1px" });
  });

  it("should parse '.5.5px' with number '.5' and unit '.5px'", () => {
    deepEqual(unit(".5.5px"), { number: ".5", unit: ".5px" });
  });

  it("should parse '1e' with unit 'e'", () => {
    deepEqual(unit("1e"), { number: "1", unit: "e" });
  });

  it("should parse '1e1' with empty unit", () => {
    deepEqual(unit("1e1"), { number: "1e1", unit: "" });
  });

  it("should parse '1ee' with unit 'ee'", () => {
    deepEqual(unit("1ee"), { number: "1", unit: "ee" });
  });

  it("should parse '1e+' with unit 'e+'", () => {
    deepEqual(unit("1e+"), { number: "1", unit: "e+" });
  });

  it("should parse '1e-' with unit 'e-'", () => {
    deepEqual(unit("1e-"), { number: "1", unit: "e-" });
  });

  it("should parse '1e+1' with empty unit", () => {
    deepEqual(unit("1e+1"), { number: "1e+1", unit: "" });
  });

  it("should parse '1e++1' with unit 'e++1'", () => {
    deepEqual(unit("1e++1"), { number: "1", unit: "e++1" });
  });

  it("should parse '1e--1' with unit 'e--1'", () => {
    deepEqual(unit("1e--1"), { number: "1", unit: "e--1" });
  });

  it("should parse '+10' with empty unit", () => {
    deepEqual(unit("+10"), { number: "+10", unit: "" });
  });

  it("should parse '-10' with empty unit", () => {
    deepEqual(unit("-10"), { number: "-10", unit: "" });
  });

  it("should return false for '.a'", () => {
    deepEqual(unit(".a"), false);
  });

  it("should return false for '.'", () => {
    deepEqual(unit("."), false);
  });

  it("should return false for '+'", () => {
    deepEqual(unit("+"), false);
  });

  it("should return false for '-'", () => {
    deepEqual(unit("-"), false);
  });

  it("should return false for '-a'", () => {
    deepEqual(unit("-a"), false);
  });

  it("should return false for '+a'", () => {
    deepEqual(unit("+a"), false);
  });

  it("should return false for '+.a'", () => {
    deepEqual(unit("+.a"), false);
  });

  it("should return false for '-.a'", () => {
    deepEqual(unit("-.a"), false);
  });

  it("should return false for empty string", () => {
    deepEqual(unit(""), false);
  });
});
