package main

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"time"
)

const tokenExpirationSeconds = 60

type TokenManager struct {
	issuer     string
	privateKey string
}

func (t *TokenManager) CreateJwt() (string, error) {
	if t.issuer == "" || t.privateKey == "" {
		return "", errors.New("missing required field issuer or private key")
	}

	key, err := t.getRsaPrivateKey()
	if err != nil {
		return "", err
	}

	var header = struct {
		Algorithm string `json:"alg"`
		Type      string `json:"typ"`
	}{
		"RS256",
		"JWT",
	}
	var payload = struct {
		Issuer     string `json:"iss"`
		Expiration int64  `json:"exp"`
	}{
		t.issuer,
		time.Now().Unix() + tokenExpirationSeconds,
	}

	headerJson, _ := json.Marshal(&header)
	payloadJson, _ := json.Marshal(&payload)
	pkg := base64.URLEncoding.EncodeToString(headerJson) + "." + base64.URLEncoding.EncodeToString(payloadJson)

	if signature, err := t.sign([]byte(pkg), key); err != nil {
		return "", err
	} else {
		return pkg + "." + base64.URLEncoding.EncodeToString(signature), nil
	}
}

func (t *TokenManager) sign(data []byte, privateKey *rsa.PrivateKey) ([]byte, error) {
	h := sha256.New()
	h.Write(data)
	d := h.Sum(nil)
	return rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, d)
}

func (t *TokenManager) getRsaPrivateKey() (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(t.privateKey))
	if block == nil {
		return nil, errors.New("invalid private key format")
	}

	switch block.Type {
	case "PRIVATE KEY":
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, err
		}
		return key.(*rsa.PrivateKey), nil
	case "RSA PRIVATE KEY":
		key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			return nil, err
		}
		return key, nil
	default:
		return nil, fmt.Errorf("unsupported key type %q", block.Type)
	}
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: tokenmanager [private key file] [issuer]")
	}

	file, err := os.Open(os.Args[1])

	if err != nil {
		log.Fatal("unable to open file", os.Args[1], ":", err)
	}

	key, err := ioutil.ReadAll(file)
	if err != nil {
		log.Fatal("unable to read file", os.Args[1], ":", err)
	}

	tm := &TokenManager{
		os.Args[2],
		string(key),
	}

	token, err := tm.CreateJwt()
	if err != nil {
		log.Fatal("unable to create token", err)
	}

	log.Println("JWT:", token)
}
