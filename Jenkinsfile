node('zbnetwork-amd64') {
    checkout scm
    docker.withRegistry('https://436994747461.dkr.ecr.us-east-1.amazonaws.com', 'ecr:us-east-1:zb-network') {
      withCredentials([[
        $class: 'AmazonWebServicesCredentialsBinding',
        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
        credentialsId: 'zb-network',
        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
      ]]) {
        sh "AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/znetstar"
        sh 'docker buildx create --use'
        sh "docker buildx build --platform linux/amd64,linux/arm64 --push --build-arg AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' --build-arg AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' --build-arg NODE_OPTIONS=--max_old_space_size=78643 -t public.ecr.aws/znetstar/zbpf ./"
      }
    }
}
