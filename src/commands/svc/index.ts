import {Args, Command, Flags} from '@oclif/core'
import * as fs from 'fs-extra';
import {makeUnitFile, writeOptions} from '../../makeUnit'
export default class PortForwardAdd extends Command {
  static description = 'Generates a systemd unit file for an arbitrary service'

  static examples = [
    `zbpf svc <unit file name> -e <exec start command> -m <descrption of unit file> <parameters> `,
    `zbpf svc test -a docker.service -e 'docker run --name test --entrypoint=/bin/bash ubuntu:22.04 -c exit' -n 'test' -r no -w /bin/bash -s 'docker rm -f test' -p 'docker pull ubuntu:22.04'`
  ]

  static flags = {
    serviceOption: Flags.string({
      multiple: true,
      description: 'Add an arbitrary option to the service unit file',
      required: false,
      char: 'o'
    }),
    dir: Flags.string({
      char: 'd',
      multiple: false,
      description: 'Systemd Unit File Dir',
      required: false,
      default: process.env.SYSTEMD_DIR || '/etc/systemd/system'
    }),
    description: Flags.string({
      char: 'n',
      description: 'Description of the service unit file',
      required: true,
    }),
    afterRequires: Flags.string({
      char: 'a',
      description: 'Services for the After= and Requires= lines',
      multiple: true
    }),
    execStart: Flags.string({
      char: 'e',
      description: 'The command in ExecStart',
      multiple: false,
      required: true
    }),
    execStartPre: Flags.string({
      char: 'p',
      description: 'The command in ExecStartPre',
      multiple: true
    }),
    execStartPost: Flags.string({
      char: 'P',
      description: 'The command in ExecStartPost',
      multiple: true
    }),
    execStop: Flags.string({
      char: 's',
      description: 'The command in ExecStop',
      multiple: true
    }),
    restart: Flags.string({
      char: 'r',
      description: 'Restart rule',
      multiple: false,
      default: 'always'
    }),
    restartSec: Flags.integer({
      char: 'R',
      default: 10
    }),
    type: Flags.string({
      char: 't',
      default: 'simple',
      required: true
    }),
    timeoutStartSec: Flags.integer({
      multiple: false,
      char: 'i',
      default: 120
    }),
    timeoutStopSec: Flags.integer({
      char: 'I',
      multiple: false,
      default: 15
    }),
    wantedBy: Flags.string({
      char: 'b',
      multiple: false,
      default: 'multi-user.target'
    }),
    environment: Flags.string({
      char: 'v',
      multiple: true,
      required: false,
      description: 'Inline environment variables in the unit file'
    }),
    environmentFile: Flags.string({
      char: 'V',
      multiple: true,
      required: false,
      description: 'File containing environment variables'
    }),
    enable: Flags.boolean({
      description: 'If true will enable the service unit file after writing',
    }),
    start: Flags.boolean({
      description: 'If true will start the service unit file after writing',
    }),
    wrap: Flags.string({
      char: 'w',
      required: false,
      description: 'Wrap each exec command in the shell provided'
    }),
    file: Flags.string({
      char: 'f',
      description: 'Write output to this file rather than STDOUT',
    }),
    append: Flags.string({
      char: 'F',
      description: 'Append output to this file rather than STDOUT',
    }),
    shell: Flags.string({
      description: 'Use a specific shell to execute the output',
      default: '/bin/bash'
    }),
  }

  static args = {
    unit: Args.string({
      description: 'Name of unit file',
      required: true
    })
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(PortForwardAdd)
    const service: Record<string, Record<string, string[]|string>> = {};

    service['Unit'] = {
      Description: flags.description
    };

    let shWrap = (line: string) => flags.wrap ? `${flags.wrap} -c "${line}"` : line;

    if (flags.afterRequires)
      service['Unit']['Requires'] = service['Unit']['After'] = flags.afterRequires.join(' ');

    service['Service'] = {
      Type: flags.type,
    };

    if (flags.execStartPre)
      service['Service']['ExecStartPre'] = flags.execStartPre.map(shWrap);

    service['Service']['ExecStart'] = shWrap(flags.execStart as string);

    if (flags.execStartPost)
      service['Service']['ExecStartPost'] = flags.execStartPost.map(shWrap);

    if (flags.execStop)
      service['Service']['ExecStop'] = flags.execStop.map(shWrap);

    if (flags.restart)
      service['Service']['Restart'] = flags.restart;

    if (flags.restartSec && flags.restart !== 'no')
      service['Service']['RestartSec'] = flags.restartSec.toString();

    if (flags.timeoutStartSec)
      service['Service']['TimeoutStartSec'] = flags.timeoutStartSec.toString();

    if (flags.timeoutStopSec)
      service['Service']['TimeoutStopSec'] = flags.timeoutStopSec.toString();

    if (flags.environment)
      service['Service']['Environment'] = flags.environment;

    if (flags.environmentFile)
      service['Service']['EnvironmentFile'] = flags.environmentFile;

    if (flags.wantedBy)
      service['Install'] = { WantedBy: flags.wantedBy };

    if (flags.serviceOption)
      writeOptions(service, flags.serviceOption);

    const output = (`#!${flags.shell}
      cat << EOF > "${flags.dir}/${args.unit}.service"
        ${makeUnitFile(service)}
      EOF

      systemctl daemon-reload
      ${flags.enable ? `systemctl enable ${args.unit}.service` : ''}
      ${flags.start ? `systemctl start ${args.unit}.service` : ''}
    `).split("\n").map(k => k.trimStart()).join("\n");

    if (flags.file) {
      await fs.writeFile(flags.file, output);
    } else if (flags.append) {
      await fs.appendFile(flags.append, output);
    } else {
      process.stdout.write(output);
    }
    process.exit(0);
  }
}
