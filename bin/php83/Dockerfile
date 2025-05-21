FROM php:8.3-apache-bookworm

# Surpresses debconf complaints of trying to install apt packages interactively
# https://github.com/moby/moby/issues/4032#issuecomment-192327844
 
ARG DEBIAN_FRONTEND=noninteractive

# Update
RUN apt-get -y update --fix-missing && \
    apt-get upgrade -y && \
    apt-get --no-install-recommends install -y apt-utils && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
            libfreetype6-dev \
            libpng-dev \
            libmcrypt-dev \
            default-mysql-client \
            vim \
            nano \
            git \
            libc-client-dev \
            libxml2-dev \
            sudo \
            wget \
            ssmtp \
            libzip-dev \
            && docker-php-ext-install gd iconv pdo pdo_mysql mysqli zip

# Install useful tools and install important libaries
RUN apt-get -y update && \
    apt-get -y --no-install-recommends install nano wget \
dialog \
libsqlite3-dev \
libsqlite3-0 && \
    apt-get -y --no-install-recommends install default-mysql-client \
zlib1g-dev \
libzip-dev \
libicu-dev && \
    apt-get -y --no-install-recommends install --fix-missing apt-utils \
build-essential \
git \
curl \
libonig-dev && \ 
    apt-get install -y iputils-ping && \
    apt-get -y --no-install-recommends install --fix-missing libcurl4 \
libcurl4-openssl-dev \
zip \
openssl && \
    rm -rf /var/lib/apt/lists/* && \
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer


# Install imagick
RUN apt-get update && \
    apt-get -y --no-install-recommends install --fix-missing libmagickwand-dev && \
    rm -rf /var/lib/apt/lists/*

# Imagick Commit to install
# https://github.com/Imagick/imagick
ARG IMAGICK_COMMIT="28f27044e435a2b203e32675e942eb8de620ee58"

RUN cd /usr/local/src && \
    git clone https://github.com/Imagick/imagick && \
    cd imagick && \
    git checkout ${IMAGICK_COMMIT} && \
    phpize && \
    ./configure && \
    make && \
    make install && \
    cd .. && \
    rm -rf imagick && \
    docker-php-ext-enable imagick

# Other PHP8 Extensions

RUN docker-php-ext-install pdo_mysql && \
    docker-php-ext-install pdo_sqlite && \
    docker-php-ext-install bcmath && \
    docker-php-ext-install mysqli && \
    docker-php-ext-install curl && \
    docker-php-ext-install zip && \
    docker-php-ext-install -j$(nproc) intl && \
    docker-php-ext-install mbstring && \
    docker-php-ext-install gettext && \
    docker-php-ext-install calendar && \
    docker-php-ext-install exif


# Install Freetype 
RUN apt-get -y update && \
    apt-get --no-install-recommends install -y libfreetype6-dev \
libjpeg62-turbo-dev \
libpng-dev && \
    rm -rf /var/lib/apt/lists/* && \
    docker-php-ext-configure gd --enable-gd --with-freetype --with-jpeg && \
    docker-php-ext-install gd


# Enable apache modules
RUN a2enmod rewrite headers

RUN pecl install xdebug

RUN echo "alias ll='ls $LS_OPTIONS -l'" >> /root/.bashrc

ENV TZ=Asia/Tehran
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY ./files/php/*.ini /usr/local/etc/php/conf.d/

ARG DOCKER_HOST_PLATFORM

COPY ./files/php/platform/*-${DOCKER_HOST_PLATFORM}.ini /usr/local/etc/php/conf.d/

COPY ./files/ssmtp/ssmtp.conf /etc/ssmtp/

RUN echo "zend_extension=$(find /usr/local/lib/php/extensions -name 'xdebug.so')" \
        >> /usr/local/etc/php/conf.d/ext-xdebug.ini

RUN mkdir /ioncube
COPY ./ioncube/* /ioncube/
RUN cd /ioncube && cd `php -i | grep extension_dir | cut -d' ' -f 5` && \
cp /ioncube/ioncube/ioncube_loader_lin_8.2.so . && \
echo zend_extension=ioncube_loader_lin_8.2.so > /usr/local/etc/php/conf.d/ext-ioncube.ini && \
rm -rf /ioncube/

COPY ./files/apache/*.conf /etc/apache2/conf-available/

COPY ./files/docker-web-init.sh /usr/local/bin/

# Cleanup
#RUN rm -rf /usr/src/*
CMD docker-web-init.sh && apache2-foreground
