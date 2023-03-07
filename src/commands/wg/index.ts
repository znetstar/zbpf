import {Args, Command, Flags} from '@oclif/core'
import * as fs from 'fs-extra';
import {makeUnitFile, writeOptions} from '../../makeUnit'

export default class WGAdd extends Command {
  static description = 'Adds a wireguard interface to the networkd files'

  static examples = [
    `zbpf wg <interface name> <various parameters>`,
    `zbpf wg wg0 -p private_key --netdevOption WireGuardPeer:PersistentKeepalive=25 -u public_key -k preshared_key -i 10.0.0.0/16 -a 10.0.44.2/32 -e wireguard.example.com:51820 -g 10.0.44.1 -b 10.0.44.0/24`
  ]

  static flags = {
    networkOption: Flags.string({
      multiple: true,
      description: 'Add an arbitrary option to the netdev unit file',
      required: false,
    }),
    netdevOption: Flags.string({
      multiple: true,
      description: 'Add an arbitrary option to the network unit file',
      required: false,
    }),
    privateKey: Flags.string({
      char: 'p',
      description: 'Private key of the local Wireguard Peer',
      required: true,
    }),
    publicKey: Flags.string({
      char: 'u',
      description: 'Public key of the remote Wireguard Server',
      required: true,
    }),
    presharedKey: Flags.string({
      char: 'k',
      description: 'Preshared key of the link',
      required: false,
    }),
    allowedIps: Flags.string({
      char: 'i',
      multiple: true,
      description: 'Adds addresses to the allowed IPs section',
      required: false,
    }),
    address: Flags.string({
      char: 'a',
      description: 'Address of the local peer',
      required: true,
    }),
    endpoint: Flags.string({
      char: 'e',
      multiple: false,
      description: 'Endpoint of the remote server',
      required: true,
    }),
    gateway: Flags.string({
      char: 'g',
      multiple: false,
      description: 'Gateway of the remote server',
      required: true,
    }),
    subnet: Flags.string({
      char: 'b',
      multiple: false,
      description: 'CIDR subnet of the remote network',
      required: true,
    }),
    dir: Flags.string({
      char: 'd',
      multiple: false,
      description: 'Systemd Networkd File Dir',
      required: false,
      default: process.env.NETWORKD_DIR || '/etc/systemd/network'
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
      default: '/bin/sh'
    }),
  }

  static args = {
    unit: Args.string({
      description: 'Name of the wireguard interface',
      required: true
    })
  }

  async run(): Promise<void> {

    const {args, flags} = await this.parse(WGAdd)
    const netdev: Record<string, Record<string, string[]|string>> = {};
    const network: Record<string, Record<string, string[]|string>> = {};

    const inter = args.unit;
    const unitName = args.unit;

    netdev['NetDev'] = {
      Name: inter,
      Kind: 'wireguard',
      'Description': `Wireguard Client for ${inter}`
    }

    netdev['WireGuard'] = {
      PrivateKeyFile: `${flags.dir}/${unitName}-private-key`
    }

    netdev['WireGuardPeer'] = {
      PublicKey: flags.publicKey,
      Endpoint: flags.endpoint,
      PersistentKeepalive: '25'
    }

    if (flags.allowedIps) {
      netdev['WireGuardPeer']['AllowedIPs'] = flags.allowedIps.join(',');
    }

    await fs.ensureDir(flags.dir);

    await fs.writeFile(`${flags.dir}/${unitName}-private-key`, flags.privateKey);
    if ( flags.presharedKey) {
      netdev['WireGuardPeer']['PresharedKeyFile'] = `${flags.dir}/${unitName}-preshared-key`;
      await fs.writeFile(`${flags.dir}/${unitName}-preshared-key`, flags.presharedKey);
    }

    network['Match'] = {
      Name: unitName
    }

    network['Network'] = {
      Address: flags.address
    }

    network['Route'] = {
      Gateway: flags.gateway,
      Destination: flags.subnet,
      GatewayOnlink: 'true'
    }


    if (flags.netdevOption)
      writeOptions(netdev, flags.netdevOption);

    if (flags.networkOption)
      writeOptions(network, flags.networkOption);

    const output = (`#!${flags.shell}
      cat << EOF > "${flags.dir}/${unitName}.netdev"
        ${makeUnitFile(netdev)}
      EOF
      cat << EOF > "${flags.dir}/${unitName}.network"
        ${makeUnitFile(network)}
      EOF

      systemctl daemon-reload
      systemctl restart systemd-networkd
    `).split("\n").map(k => k.trim()).join("\n");

    if (flags.file) {
      await fs.writeFile(flags.file, output);
    } else if (flags.append) {
      await fs.appendFile(flags.append, output);
    } else {
      process.stdout.write(output);
    }
  }
}
