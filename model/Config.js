import chokidar from 'chokidar';
import fs from 'fs';
import YAML from 'yaml';

import { PATH } from './PATH.js';

class Config {
  // Config中存着的配置
  defSet = {};
  config = {};
  // 正在监听的watcher
  #watcher = { defSet: {}, config: {} };

  constructor() {
    this.#initConifg();
  }

  async #initConifg() {
    const asConfig = await this.#getFile('defSet', '', 'config');
    return Object.entries(asConfig).flatMap(([app, nameArr]) =>
      nameArr.map(name => copyFile(`${PATH.defSet}/${app}/${name}`, `${PATH.config}/${app}/${name}`))
    );
  }

  /** 获取配置文件信息，config会覆盖defSet */
  getConfig(app, name) {
    return {
      ...this.#getFile('defSet', app, name),
      ...this.#getFile('config', app, name),
    };
  }

  /**<<<<<<<<<<<<<<<<< Private >>>>>>>>>>>>>>>>>>> */

  /** 监听配置文件 */
  #watch(type, app, name) {
    const key = `${app}.${name}`;

    // 检查watcher是否已经在监听了
    if (this.#watcher[type][key]) return;

    // 没有就设置新监听
    const watcher = chokidar.watch(`${PATH[type]}/${app}/${name}.yaml`);
    watcher.on('change', () => {
      // 改变了，清除在Config的记录
      delete this[type][key];
      logger.mark(`[排表修改配置文件][${type}][${app}][${name}]`);

      // 以及执行外部硬塞给Config的新任务 目前有:
      // if (this[`change_${app}_${name}`]) {
      //   this[`change_${app}_${name}`]();
      // }
    });

    // 添加到watcher
    this.#watcher[type][key] = watcher;
  }

  /**
   * 获取配置文件并存在config中
   * @param type config/defSet
   * @param app 分类
   * @param name 文件名
   * @returns 配置文件内容, false when read error
   */
  #getFile(type, app, name) {
    const key = `${app}.${name}`;

    // 如果已经在Config里了直接返回之
    if (this[type][key]) return this[type][key];

    // 否则读取并存起来，然后设置监听
    const filePath = `${PATH[type]}/${app}/${name}.yaml`;
    if (!fs.existsSync(filePath)) return {};
    const fileData = fs.readFileSync(filePath, 'utf-8');
    if (!fileData) return {};

    this[type][key] = YAML.parse(fileData);
    this.#watch(type, app, name);

    // 然后返回读到的东西（拷贝）
    return this[type][key];
  }
}

export default new Config();
