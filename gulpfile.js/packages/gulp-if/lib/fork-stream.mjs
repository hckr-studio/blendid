import { Readable, Writable } from "node:stream";

export class ForkStream extends Writable {
  constructor(options = {}) {
    super({ ...options, objectMode: true });

    if (options.classifier) {
      this._classifier = options.classifier;
    }

    this.a = new Readable({ ...options, objectMode: true });
    this.b = new Readable({ ...options, objectMode: true });

    let resume = null;

    this.a._read = () => {
      if (resume) {
        const r = resume;
        resume = null;
        r();
      }
    };

    this.b._read = () => {
      if (resume) {
        const r = resume;
        resume = null;
        r();
      }
    };

    this.on("finish", () => {
      this.a.push(null);
      this.b.push(null);
    });
  }

  _classifier(e, done) {
    return done(null, !!e);
  }

  _write(input, encoding, done) {
    this._classifier.call(null, input, (err, res) => {
      if (err) {
        return done(err);
      }

      const out = res ? this.a : this.b;

      if (out.push(input)) {
        return done();
      } else {
        this.resume = done;
      }
    });
  }
}
