import fs from 'fs';

import plugin from '../../../lib/plugins/plugin.js';
import { PATH } from '../model/PATH.js';
import { getStrLen, num2Ch } from '../model/misc.js';

export class table extends plugin {
  constructor() {
    super({
      name: 'table',
      dsc: '表命令',
      priority: 50,
      rule: [
        {
          reg: '^#排表规则$',
          fnc: 'tabHelp',
        },
        {
          reg: '^#新建表$',
          fnc: 'tabBuild',
        },
        {
          reg: '^#设置地点$',
          fnc: 'setPlace',
        },
        {
          reg: '^#设置规则$',
          fnc: 'setRule',
        },
        {
          reg: '^#设置战队$',
          fnc: 'setTeam',
        },
        {
          reg: '^#查看表$',
          fnc: 'tabSee',
        },
        {
          reg: '^#结束表$',
          fnc: 'tabEnd',
        },
      ],
    });
  }

  /** #排表规则 */
  tabHelp(e) {
    const commands = [
      '【表命令】',
      '  #新建表 #查看表 #结束表',
      '  #设置地点 #设置规则 #设置战队',
      '  #排表规则',
      '【轮次命令】',
      '  AA vs BB',
      '  #记录 AA 32',
      '  #下一轮',
      '  #切换第5轮 #切换第一一八轮',
    ];
    e.reply(commands.join('\n'));
  }

  /** 新建表 */
  async tabBuild(e) {
    const curTab = await redis.get('tabulate.table');
    if (curTab) {
      e.reply('存在未结束表，确认结束吗？（确认/取消）');
      return this.setContext('tabBuildCover', true, 30);
    }

    await e.reply('正在新建表...');
    const time = new Date();
    await redis.set(
      'tabulate.table',
      JSON.stringify({
        时间: `${time.getFullYear()}.${time.getMonth() + 1}.${time.getDate()}`,
        地点: '未知',
        规则: '未知',
        战队: ['佚名', '群星'],
        轮次: 1,
        记录: [[]],
      })
    );
    await redis.set('tabulate.round', 0);
    await e.reply('请输入地点（回复空格/0跳过）');
    return this.setContext('setPlace', true, 30);
  }

  async tabBuildCover() {
    const cover = this.e.msg;
    if (cover === '确认') {
      await this.tabEnd(this.e);
      this.finish('tabBuildCover', true);
      return await this.tabBuild(this.e);
    }

    this.finish('tabBuildCover', true);
    return await this.e.reply('覆盖表操作已取消');
  }

  /** 设置表 */
  async setPlace() {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await this.e.reply('当前没有表，请先 #新建表');
    const curTable = JSON.parse(curTab);

    const placeName = this.e.msg.trim();

    if (placeName && placeName !== '0') {
      if (placeName === '#设置地点') {
        await this.e.reply('请输入地点（回复空格/0取消）');
        return this.setContext('setPlace', true, 30);
      }
      curTable.地点 = placeName;
      await redis.set('tabulate.table', JSON.stringify(curTable));
    }

    this.finish('setPlace', true);
    if (curTable.规则 !== '未知') return await this.e.reply('地点设置成功');

    await this.e.reply('请输入规则（回复空格/0跳过）');
    return this.setContext('setRule', true, 30);
  }

  async setRule() {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await this.e.reply('当前没有表，请先 #新建表');
    const curTable = JSON.parse(curTab);

    const ruleName = this.e.msg.trim();

    if (ruleName && ruleName !== '0') {
      if (ruleName === '#设置规则') {
        await this.e.reply('请输入规则（回复空格/0取消）');
        return this.setContext('setRule', true, 30);
      }
      curTable.规则 = ruleName;
      await redis.set('tabulate.table', JSON.stringify(curTable));
    }

    this.finish('setRule', true);
    if (curTable.战队[0] !== '佚名' || curTable.战队[1] !== '群星') return await this.e.reply('规则设置成功');

    await this.e.reply('请输入战队（格式 AA vs BB， 回复空格/0跳过）');
    return this.setContext('setTeam', true, 30);
  }

  async setTeam() {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await this.e.reply('当前没有表，请先 #新建表');
    const curTable = JSON.parse(curTab);

    const teamName = this.e.msg.trim();

    if (teamName && teamName !== '0') {
      if (teamName === '#设置战队') {
        await this.e.reply('请输入战队（格式 AA vs BB，回复空格/0取消）');
        return this.setContext('setTeam', true, 30);
      }
      if (/.*? vs .*/.test(teamName)) {
        const [team0, team1] = teamName.split(' vs ').map(tn => tn.trim());
        curTable.战队 = [team0, team1];
        await redis.set('tabulate.table', JSON.stringify(curTable));
      } else {
        this.finish('setTeam', true);

        this.e.reply('格式错误，应为 AA vs BB，请重新输入');
        return this.setContext('setTeam', true, 30);
      }
    }

    this.finish('setTeam', true);
    return await this.e.reply('战队设置成功');
  }

  /** 查看表 */
  async tabSee(e) {
    const curTab = await redis.get('tabulate.table');
    if (!curTab) return await e.reply('当前没有表，请先 #新建表');
    const ct = JSON.parse(curTab);

    const table = [
      `时间：${ct.时间}`,
      `地点：${ct.地点}`,
      `规则：${ct.规则}`,
      `轮次：${ct.轮次}`,
      `${ct.战队[0]}-----=-VS-=-----${ct.战队[1]}`,
    ];

    for (const [i, round] of ct.记录.entries()) {
      table.push(`------------第${num2Ch(i + 1)}轮------------`);
      for (const battle of round) {
        table.push(
          `=${ct.战队[0]}=${battle.leftName.padEnd(9 - getStrLen(battle.leftName) + battle.leftName.length, ' ')} ${
            battle.leftPoint
          }:${battle.rightPoint}     =${ct.战队[1]}=${battle.rightName}`
        );
      }
    }

    await e.reply(table.join('\n'));
    return table.join('\n');
  }

  /** 结束表 */
  async tabEnd(e) {
    const tableStr = await this.tabSee(e);
    if (typeof tableStr !== 'string') return;

    await redis.del('tabulate.table');
    await redis.set('tabulate.round', 0);

    const now = Date.now().toString(36);
    const savePath = `${PATH.data}/table-${now}.txt`;
    fs.writeFileSync(savePath, tableStr);
    return await e.reply(`结束了当前表`);
  }
}
