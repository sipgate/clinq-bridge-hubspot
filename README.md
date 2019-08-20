# clinq-bridge-hubspot

## Configuration

```bash
cp env.sh.dist env.sh
vim env.sh
# Add your hubspot client ID and secret
```

## Usage

```bash
yarn
. ./env.sh
yarn start
```

## Examples

### Create call event

```bash
curl --data @exampleCallEvent.json -H "content-type: application/json" -H 'X-Provider-Locale: de_DE' -H 'X-Provider-Key: xxx-yyy-zzz' http://localhost:8080/events/calls
```
