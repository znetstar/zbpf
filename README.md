# zbpf

Adds systemd system unit files for port forwarding, and network unit files for wireguard interfaces.

All commands generate a shell script as output. Either pipe the script into bash or execute on a remote machine.

## Port Forward
Syntax Example:
`zbpf fwd <unit name> -l <local address to bind to> <remote address>`

Full example 
`zbpf fwd my-forward -o Socket:Accept=yes -b eth0 -l 127.0.0.1:1234 -l 192.168.0.1:2345 10.0.0.1:1234 | bash`

## Wireguard

Syntax Example:
`zbpf wg <interface name> <various parameters>`
Full example
`zbpf wg0 ...`

## Docker

Build docker with `docker build -t zbpf .`, or use the image `public.ecr.aws/znetstar/zbpf`
