import parse from "./parse.mjs";
import stringify from "./stringify.mjs";
import unit from "./unit.mjs";
import walk from "./walk.mjs";

class ValueParserImpl {
  constructor(value) {
    this.nodes = parse(value);
  }

  toString() {
    return Array.isArray(this.nodes) ? stringify(this.nodes) : "";
  }

  walk(cb, bubble) {
    walk(this.nodes, cb, bubble);
    return this;
  }
}

function ValueParser(value) {
  if (new.target) {
    return new ValueParserImpl(value);
  }
  return new ValueParserImpl(value);
}

ValueParser.prototype = ValueParserImpl.prototype;
ValueParser.unit = unit;
ValueParser.walk = walk;
ValueParser.stringify = stringify;
ValueParser.parse = parse;

export default ValueParser;
export { parse, stringify, unit, walk };
