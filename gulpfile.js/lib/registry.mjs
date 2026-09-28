/**
 * A simple registry for storing and retrieving tasks.
 * @abstract
 */
export class Registry {
  #tasks;

  constructor() {
    this.#tasks = new Map();
  }

  /**
   * For backward compatibility and testing purposes.
   * @returns {*}
   * @private
   */
  get _tasks() {
    return this.#tasks;
  }

  /**
   * Initialize the registry (no-op by default, can be overridden by subclasses)
   * @abstract
   * @param {import('gulp').Gulp} gulp - The gulp instance
   */
  init(gulp) {}

  /**
   * Get a task by name
   * @param {string} name - The name of the task
   * @returns {Function|undefined} The task function or undefined
   */
  get(name) {
    return this.#tasks.get(name);
  }

  /**
   * Set a task by name
   * @param {string} name - The name of the task
   * @param {Function} fn - The task function
   * @returns {Function} The task function that was set
   */
  set(name, fn) {
    this.#tasks.set(name, fn);
    return fn;
  }

  /**
   * Get all tasks as an object
   * @returns {Record<string, Function>} Object with task names as keys
   */
  tasks() {
    return Object.fromEntries(
      Array.from(this.#tasks).map(([name]) => [name, this.get(name)])
    );
  }
}
