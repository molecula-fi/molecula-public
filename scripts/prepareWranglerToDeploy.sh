ENV_OUTPUT=$(yarn run --silent prepare-web-deploy:parse)

eval $ENV_OUTPUT

find . -type f -name "wrangler.template.toml" -print0 | xargs -0 -I {} sh -c 'envsubst < "{}" > "$(dirname "{}")/wrangler.toml"'
find . -type f -name ".dev.template.vars" -print0 | xargs -0 -I {} sh -c 'envsubst < "{}" > "$(dirname "{}")/.dev.vars"'
find . -type f -name ".env.template" -print0 | xargs -0 -I {} sh -c 'envsubst < "{}" > "$(dirname "{}")/.env"'