import {Args, Command, Flags} from '@oclif/core'
import * as fs from 'fs-extra';
import {makeUnitFile, writeOptions} from '../../makeUnit'
export default class PortForwardAdd extends Command {
  static description = 'Adds systemd socket activation unit files to effect port forwarding'

  static examples = [
    `zbpf <unit name> fwd -l <local address to bind to> <remote address>`,
    `zbpf my-forward fwd -o Socket:Accept=yes -b eth0 -l 127.0.0.1:1234 -l 192.168.0.1:2345 10.0.0.1:1234`
  ]

  static flags = {
    socketOption: Flags.string({
      char: 'o',
      multiple: true,
      description: 'Add an arbitrary option to the socket unit file',
      required: false,
    }),
    serviceOption: Flags.string({
      multiple: true,
      description: 'Add an arbitrary option to the service unit file',
      required: false,
    }),
    bindToDevice: Flags.string({
      char: 'b',
      multiple: true,
      description: 'Adds interfaces to the "BindTo" section of the unit file',
      required: false,
    }),
    listen: Flags.string({
      char: 'l',
      multiple: true,
      description: 'Adds addresses to the "ListenStream" section of the unit file',
      required: false,
    }),
    wantedBy: Flags.string({
      char: 'w',
      multiple: false,
      description: 'Adds a WantedTo target in the install section',
      required: false,
      default: 'sockets.target'
    }),
    dir: Flags.string({
      char: 'd',
      multiple: false,
      description: 'Systemd Unit File Dir',
      required: false,
      default: process.env.SYSTEMD_DIR || '/etc/systemd/system'
    }),
    destination: Flags.string({
      char: 'e',
      multiple: false,
      description: 'Destination address passed to systemd-socket-proxyd',
      required: true,
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
    enable: Flags.boolean({
      description: 'If true will enable the service unit file after writing',
    }),
    start: Flags.boolean({
      description: 'If true will start the service unit file after writing',
    }),
  }

  static args = {
    unit: Args.string({
      description: 'Name of the unit file',
    })
  }

  async run(): Promise<void> {

    const {args, flags} = await this.parse(PortForwardAdd)
    const socket: Record<string, Record<string, string[]|string>> = {};
    const service: Record<string, Record<string, string[]|string>> = {};
    const unitName = args.unit;

    socket['Unit'] = {
      'Description': `Port Forward to ${flags.destination}`
    };

    service['Unit'] = {
      'Description': `Port Forward to ${flags.destination}`,
      Requires: `${unitName}.socket`,
      After: `${unitName}.socket`
    }

    if (flags.listen) {
      socket['Socket'] = socket['Socket'] || {};
      socket['Socket']['ListenStream'] = [ ...flags.listen ];
    }

    if (flags.bindToDevice) {
      socket['Socket'] = socket['Socket'] || {};
      socket['Socket']['BindToDevice'] = [ ...flags.bindToDevice ];
    }

    if (flags.wantedBy) {
      socket['Install'] = socket['WantedBy'] || {};
      socket['Install']['WantedBy'] = flags.wantedBy;
    }

    service['Service'] = {
      ExecStart: `/usr/lib/systemd/systemd-socket-proxyd ${flags.destination}`
    }

    if (flags.socketOption)
      writeOptions(socket, flags.socketOption);
    if (flags.serviceOption)
      writeOptions(socket, flags.serviceOption);

    const output = (`#!${flags.shell}
      cat << EOF > "${flags.dir}/${unitName}.socket"
        ${makeUnitFile(socket)}
      EOF
      cat << EOF > "${flags.dir}/${unitName}.service"
        ${makeUnitFile(service)}
      EOF

      systemctl daemon-reload
      ${flags.enable ? `systemctl enable ${unitName}.socket` : ''}
      ${flags.start ? `systemctl start ${unitName}.socket` : ''}
    `).split("\n").map(k => k.trimStart()).join("\n").trimEnd();

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
