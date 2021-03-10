# clinq-bridge-hubspot

## Configuration

```bash
cp .env.dist .env
vim .env
# Add your hubspot client ID and secret
```

## Usage

```bash
yarn
yarn start
```

## Examples

### Create call event

```bash
curl --data @exampleCallEvent.json -H "content-type: application/json" -H 'X-Provider-Locale: de_DE' -H 'X-Provider-Key: xxx-yyy-zzz' http://localhost:8080/events/calls
```
