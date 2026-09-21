import assert from "node:assert";
import cp from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import stream from "node:stream";
import { describe, it } from "node:test";
import eos from "./end-of-stream.mjs";

describe("end-of-stream", () => {
  it("fs writestream destroy", async () => {
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream("/dev/null");

      eos(ws, function (err) {
        assert.ok(!!err);
        assert.strictEqual(this, ws);
        resolve();
      });

      ws.destroy();
    });
  });

  it("fs readstream destroy", async () => {
    await new Promise((resolve, reject) => {
      const rs1 = fs.createReadStream("/dev/urandom");

      eos(rs1, function (err) {
        assert.ok(!!err);
        assert.strictEqual(this, rs1);
        resolve();
      });

      rs1.destroy();
    });
  });

  it("fs readstream pipe", async () => {
    await new Promise((resolve, reject) => {
      const rs2 = fs.createReadStream(import.meta.filename);

      eos(rs2, function (err) {
        assert.ifError(err);
        assert.strictEqual(this, rs2);
        resolve();
      });

      rs2.pipe(fs.createWriteStream("/dev/null"));
    });
  });

  it("fs readstream cancel", async () => {
    await new Promise((resolve, reject) => {
      const rs3 = fs.createReadStream(import.meta.filename);

      const cancel = eos(rs3, (err) => {
        reject(new Error("should not enter"));
      });

      cancel();

      rs3.pipe(fs.createWriteStream("/dev/null"));
      rs3.on("end", () => {
        resolve();
      });
    });
  });

  it("exec", async () => {
    await new Promise((resolve, reject) => {
      const exec = cp.exec("echo hello world");

      eos(exec, function (err) {
        assert.ifError(err);
        assert.strictEqual(this, exec);
        resolve();
      });
    });
  });

  it("spawn", async () => {
    await new Promise((resolve, reject) => {
      const spawn = cp.spawn("echo", ["hello world"]);
      eos(spawn, function (err) {
        assert.ifError(err);
        assert.strictEqual(this, spawn);
        resolve();
      });
    });
  });

  it("tcp socket", async () => {
    await new Promise((resolve, reject) => {
      const socket = net.connect(50001);

      eos(socket, function (err) {
        assert.ok(!!err);
        assert.strictEqual(this, socket);
      });

      const server = net
        .createServer((socket) => {
          eos(socket, function (err) {
            assert.ok(!!err);
            assert.strictEqual(this, socket);
          });
          socket.destroy();
        })
        .listen(0, () => {
          const port = server.address().port;
          const socket = net.connect(port);
          eos(socket, function () {
            assert.strictEqual(this, socket);
            server.close();
            resolve();
          });
        });
    });
  });

  it("http", async () => {
    await new Promise((resolve, reject) => {
      const server2 = http
        .createServer((req, res) => {
          eos(res, (err) => {
            assert.ifError(err);
          });
          res.end();
        })
        .listen(() => {
          const port = server2.address().port;
          http.get("http://localhost:" + port, (res) => {
            eos(res, (err) => {
              assert.ifError(err);
              server2.close();
              resolve();
            });
            res.resume();
          });
        });
    });
  });

  it("end() and emit(close)", async () => {
    if (!stream.Writable) return;
    await new Promise((resolve, reject) => {
      const ws = new stream.Writable();

      ws._write = (data, enc, cb) => {
        process.nextTick(cb);
      };

      eos(ws, (err) => {
        assert.ifError(err);
        resolve();
      });

      ws.write("hi");
      ws.end();
      ws.emit("close");
    });
  });
});
